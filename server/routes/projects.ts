/**
 * §8 — Projects. Mounted at `/organizations/:organizationId/projects` (mergeParams).
 */

import { Router, type Request, type Response } from 'express';
import type { Project } from '../../src/services/types.js';
import { store } from '../lib/store.js';
import { ok, created, notFound } from '../lib/http.js';

export function createProjectsRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/profitability', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const projects = store.projects.filter(p => p.organizationId === orgId);
    const profitability = projects.map(proj => {
      const profit = proj.quotedAmount - proj.actualCost;
      const profitMargin = proj.quotedAmount > 0 ? (profit / proj.quotedAmount) * 100 : 0;
      const budgetVariance = proj.quotedAmount > 0
        ? ((proj.actualCost - proj.quotedAmount) / proj.quotedAmount) * 100
        : 0;
      return {
        projectId: proj.id,
        projectName: proj.name,
        clientName: proj.clientName,
        quotedAmount: proj.quotedAmount,
        actualCost: proj.actualCost,
        profit,
        profitMargin: Math.round(profitMargin * 10) / 10,
        status: proj.status,
        budgetVariance: Math.round(budgetVariance * 10) / 10,
      };
    });
    ok(res, profitability);
  });

  r.get('/', (req: Request, res: Response) => {
    ok(res, store.projects.filter(p => p.organizationId === req.params.organizationId));
  });

  r.get('/:id/transactions', (req: Request, res: Response) => {
    ok(res, store.transactions.filter(t => t.projectId === req.params.id));
  });

  r.get('/:id', (req: Request, res: Response) => {
    const project = store.projects.find(p => p.id === req.params.id) || null;
    if (!project) return notFound(res, 'Project');
    ok(res, project);
  });

  r.post('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const data = req.body as Omit<Project, 'id' | 'organizationId'>;
    const newProject: Project = { ...data, id: store.generateId('proj'), organizationId: orgId };
    store.projects.push(newProject);
    store.persist();
    created(res, newProject, 'Project created');
  });

  r.patch('/:id', (req: Request, res: Response) => {
    const idx = store.projects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return notFound(res, 'Project');
    store.projects[idx] = { ...store.projects[idx], ...(req.body as Partial<Project>) };
    store.persist();
    ok(res, store.projects[idx]);
  });

  r.delete('/:id', (req: Request, res: Response) => {
    const idx = store.projects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return notFound(res, 'Project');
    store.projects.splice(idx, 1);
    store.persist();
    ok(res, null, 'Project deleted');
  });

  return r;
}
