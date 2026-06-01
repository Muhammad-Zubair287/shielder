-- AuditLog query-performance indexes for superadmin settings/log filters
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_idx"
ON "audit_logs"("entityType");

CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx"
ON "audit_logs"("createdAt");

CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx"
ON "audit_logs"("userId");

CREATE INDEX IF NOT EXISTS "audit_logs_entityType_createdAt_idx"
ON "audit_logs"("entityType", "createdAt");

CREATE INDEX IF NOT EXISTS "audit_logs_entityType_userId_createdAt_idx"
ON "audit_logs"("entityType", "userId", "createdAt");
