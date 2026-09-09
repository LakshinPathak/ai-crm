import { Router } from 'express';
import {
  createCompany,
  deleteCompany,
  getCompany,
  listCompanies,
  updateCompany,
} from './handlers.js';

export const companiesRouter = Router();
companiesRouter.get('/', listCompanies);
companiesRouter.get('/:companyId', getCompany);
companiesRouter.post('/', createCompany);
companiesRouter.patch('/:companyId', updateCompany);
companiesRouter.delete('/:companyId', deleteCompany);
