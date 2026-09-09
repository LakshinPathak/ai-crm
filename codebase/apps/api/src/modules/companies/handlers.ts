import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Company, Deal } from '@ai-crm/db';
import { CreateCompanySchema, UpdateCompanySchema } from '@ai-crm/shared';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function companyPayload(company: InstanceType<typeof Company>) {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain ?? null,
    industry: company.industry ?? null,
    logoUrl: company.logoUrl ?? null,
    employeeCount: company.employeeCount ?? null,
  };
}

export async function listCompanies(req: AuthedRequest, res: Response) {
  const companies = await Company.find({
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  }).sort({ name: 1 });

  res.json({
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain ?? null,
      industry: c.industry ?? null,
    })),
  });
}

export async function getCompany(req: AuthedRequest, res: Response) {
  const workspaceId = req.tenant!.workspaceId;
  const company = await Company.findOne({
    _id: paramId(req.params.companyId),
    workspaceId,
    deletedAt: null,
  });

  if (!company) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Company not found' } });
    return;
  }

  const deals = await Deal.find({
    workspaceId,
    companyId: company._id,
    deletedAt: null,
  }).sort({ updatedAt: -1 });

  res.json({
    company: companyPayload(company),
    deals: deals.map((d) => ({
      id: d.id,
      title: d.title,
      amount: d.amount,
      currency: d.currency,
      sentiment: d.sentiment,
      isHot: d.isHot,
      winProbability: d.winProbability,
      status: d.status,
      blockerCount: d.blockerCount ?? 0,
    })),
  });
}

export async function createCompany(req: AuthedRequest, res: Response) {
  const parsed = CreateCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const company = await Company.create({
    workspaceId: req.tenant!.workspaceId,
    name: parsed.data.name,
    domain: parsed.data.domain,
    industry: parsed.data.industry,
    logoUrl: parsed.data.logoUrl,
    employeeCount: parsed.data.employeeCount,
  });

  res.status(201).json({ company: companyPayload(company) });
}

export async function updateCompany(req: AuthedRequest, res: Response) {
  const parsed = UpdateCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const company = await Company.findOne({
    _id: paramId(req.params.companyId),
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!company) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Company not found' } });
    return;
  }

  if (parsed.data.name !== undefined) company.name = parsed.data.name;
  if (parsed.data.domain !== undefined) company.domain = parsed.data.domain;
  if (parsed.data.industry !== undefined) company.industry = parsed.data.industry;
  if (parsed.data.logoUrl !== undefined) company.logoUrl = parsed.data.logoUrl;
  if (parsed.data.employeeCount !== undefined) company.employeeCount = parsed.data.employeeCount;
  await company.save();

  res.json({ company: companyPayload(company) });
}

export async function deleteCompany(req: AuthedRequest, res: Response) {
  const company = await Company.findOne({
    _id: paramId(req.params.companyId),
    workspaceId: req.tenant!.workspaceId,
    deletedAt: null,
  });
  if (!company) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Company not found' } });
    return;
  }

  company.deletedAt = new Date();
  await company.save();
  res.json({ deleted: true });
}
