'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PRICING_WIZARD } from '@/lib/marketing-content';
import { apiPost } from '@/lib/api-client';
import { cn } from 'cn';

type WizardState = {
  teamSize: string;
  crm: string;
  primaryNeed: string;
  email: string;
  company: string;
};

const STEPS = [
  { id: 1, question: 'How big is your revenue team?' },
  { id: 2, question: 'Which CRM do you use?' },
  { id: 3, question: 'What do you need most?' },
  { id: 4, question: 'Work email + company' },
] as const;

const INITIAL: WizardState = {
  teamSize: '',
  crm: '',
  primaryNeed: '',
  email: '',
  company: '',
};

function OptionCards({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  columns?: 1 | 2;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')}>
      {options.map((opt) => (
        <Label
          key={opt.value}
          htmlFor={`wizard-${opt.value}`}
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 text-sm text-foreground transition-colors',
            value === opt.value
              ? 'border-primary bg-primary/5 text-foreground'
              : 'hover:bg-muted/50',
          )}
        >
          <RadioGroupItem value={opt.value} id={`wizard-${opt.value}`} />
          <span>{opt.label}</span>
        </Label>
      ))}
    </RadioGroup>
  );
}

export function PricingWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const progress = (step / STEPS.length) * 100;

  function selectField<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function canContinue() {
    if (step === 1) return Boolean(form.teamSize);
    if (step === 2) return Boolean(form.crm);
    if (step === 3) return Boolean(form.primaryNeed);
    if (step === 4) return Boolean(form.email.trim() && form.company.trim());
    return false;
  }

  async function submit() {
    if (!canContinue()) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost<{ id: string; email: string }>('/leads', null, {
        email: form.email.trim(),
        company: form.company.trim(),
        source: 'pricing_wizard',
        metadata: {
          teamSize: form.teamSize,
          crm: form.crm,
          primaryNeed: form.primaryNeed,
        },
      });
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again or contact us.');
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (step < 4) {
      if (!canContinue()) return;
      setStep(step + 1);
      return;
    }
    void submit();
  }

  function back() {
    if (step > 1) setStep(step - 1);
  }

  if (done) {
    return (
      <Card className="mkt-wizard mkt-wizard--done border-border bg-card" id="quote">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Check className="size-7" />
          </div>
          <CardTitle className="text-foreground">Thanks — we&apos;ll be in touch</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your custom pricing request is in. We&apos;ll reach out at {form.email} shortly.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mkt-wizard border-border bg-card" id="quote">
      <CardHeader>
        <p className="text-xs font-medium text-muted-foreground">Step {step} of {STEPS.length}</p>
        <CardTitle className="text-foreground">{STEPS[step - 1].question}</CardTitle>
        <Progress value={progress} className="mt-2 h-1.5" />
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 1 && (
          <OptionCards
            options={PRICING_WIZARD.teamSize}
            value={form.teamSize}
            onChange={(v) => selectField('teamSize', v)}
          />
        )}

        {step === 2 && (
          <OptionCards
            options={PRICING_WIZARD.crm}
            value={form.crm}
            onChange={(v) => selectField('crm', v)}
          />
        )}

        {step === 3 && (
          <OptionCards
            options={PRICING_WIZARD.need}
            value={form.primaryNeed}
            onChange={(v) => selectField('primaryNeed', v)}
            columns={1}
          />
        )}

        {step === 4 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wizard-email">Work email</Label>
              <Input
                id="wizard-email"
                type="email"
                value={form.email}
                onChange={(e) => selectField('email', e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-company">Company</Label>
              <Input
                id="wizard-company"
                type="text"
                value={form.company}
                onChange={(e) => selectField('company', e.target.value)}
                placeholder="Acme Corp"
                autoComplete="organization"
                required
              />
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          {step > 1 && (
            <Button variant="ghost" onClick={back} disabled={loading}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          )}
          <Button onClick={next} disabled={!canContinue() || loading}>
            {loading ? 'Submitting…' : step < 4 ? 'Continue' : 'Get custom pricing'}
            {step < 4 && !loading && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
