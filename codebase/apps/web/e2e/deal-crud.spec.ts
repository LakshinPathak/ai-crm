import { test, expect } from '@playwright/test';
import { ensureOnboardedUser, setAuthToken, API_URL } from './helpers/auth';

const EMAIL = `e2e-crud-${Date.now()}@ai-crm.test`;

test.describe('deal satellite CRUD and members', () => {
  test('notes PATCH, blockers, home, approvals, invite APIs work', async ({ page, request }) => {
    const token = await ensureOnboardedUser(EMAIL, 'E2E CRUD User');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const dealsRes = await request.get(`${API_URL}/api/v1/deals`, { headers });
    expect(dealsRes.ok()).toBeTruthy();
    const dealsBody = await dealsRes.json();
    const dealId = dealsBody.deals?.[0]?.id as string | undefined;
    expect(dealId, 'seeded workspace should have a deal').toBeTruthy();

    const noteCreate = await request.post(`${API_URL}/api/v1/deals/${dealId}/notes`, {
      headers,
      data: { body: 'E2E original note' },
    });
    expect(noteCreate.status()).toBe(201);
    const noteId = (await noteCreate.json()).note.id as string;

    const notePatch = await request.patch(`${API_URL}/api/v1/deals/${dealId}/notes/${noteId}`, {
      headers,
      data: { body: 'E2E edited note' },
    });
    expect(notePatch.ok()).toBeTruthy();
    expect((await notePatch.json()).note.body).toBe('E2E edited note');

    const blocker = await request.post(`${API_URL}/api/v1/deals/${dealId}/blockers`, {
      headers,
      data: { title: 'E2E blocker', severity: 'medium' },
    });
    expect(blocker.status()).toBe(201);

    const suggest = await request.post(`${API_URL}/api/v1/ai/suggest-blocker`, {
      headers,
      data: { dealId },
    });
    expect(suggest.ok()).toBeTruthy();
    expect((await suggest.json()).title).toBeTruthy();

    const home = await request.get(`${API_URL}/api/v1/home`, { headers });
    expect(home.ok()).toBeTruthy();
    const homeBody = await home.json();
    expect(homeBody.focusDeals).toBeDefined();

    const approvals = await request.get(`${API_URL}/api/v1/approvals?status=pending&assignee=me`, { headers });
    expect(approvals.ok()).toBeTruthy();

    const agents = await request.get(`${API_URL}/api/v1/agents`, { headers });
    expect(agents.ok()).toBeTruthy();
    for (const agent of (await agents.json()).agents ?? []) {
      expect(agent.isActive).not.toBe(false);
    }

    const invite = await request.post(`${API_URL}/api/v1/workspace/members/invite`, {
      headers,
      data: { email: `invited-${Date.now()}@ai-crm.test`, role: 'member' },
    });
    expect(invite.status()).toBe(201);
    const inviteJson = await invite.json();
    expect(inviteJson.invite.inviteUrl).toContain('/sign-in?invite=');

    const deletedNotes = await request.get(`${API_URL}/api/v1/deals/not-a-valid-id/notes`, { headers });
    expect(deletedNotes.status()).toBe(404);

    await setAuthToken(page, token);
    await page.goto(`/deals/${dealId}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Add blocker' })).toBeVisible({ timeout: 15_000 });
  });
});
