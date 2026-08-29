/**
 * §17 — Audit log. Mounted at `/organizations/:organizationId/audit-logs`, under the shared
 * requireAuth + requireOrgMembership gate applied to the whole `/organizations/:organizationId`
 * prefix in apiV1.ts — no extra guard needed here, same as the GET route below.
 * Parity with client `auditService`: no seed entries, in-memory only (grows as actions are logged).
 */

import { Router, type Request, type Response } from 'express';
import { ok } from '../lib/http.js';

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

const auditLogs: AuditLogEntry[] = [];

export function pushAuditLog(entry: AuditLogEntry): void {
  auditLogs.unshift(entry);
}

export function createAuditRouter(): Router {
  const r = Router({ mergeParams: true });

  r.get('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const { severity, action, search } = req.query as { severity?: string; action?: string; search?: string };
    let logs = auditLogs.filter(l => l.organizationId === orgId);
    if (severity) logs = logs.filter(l => l.severity === severity);
    if (action) logs = logs.filter(l => l.action === action);
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l => l.details.toLowerCase().includes(q) || l.userName.toLowerCase().includes(q));
    }
    ok(res, logs);
  });

  r.post('/', (req: Request, res: Response) => {
    const orgId = req.params.organizationId;
    const body = req.body as Omit<AuditLogEntry, 'id' | 'timestamp' | 'organizationId'>;
    const entry: AuditLogEntry = {
      ...body,
      organizationId: orgId,
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    pushAuditLog(entry);
    ok(res, entry);
  });

  return r;
}
