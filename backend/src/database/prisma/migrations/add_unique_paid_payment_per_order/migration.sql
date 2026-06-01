-- Prevent duplicate PAID payments for the same order
-- Add unique constraint: only one PAID payment per order
CREATE UNIQUE INDEX "idx_unique_paid_payment_per_order" 
ON "payments"("order_id") 
WHERE "status" = 'PAID';

-- Alternative: Document the business rule via check constraint (informational)
-- Note: PostgreSQL doesn't support conditional unique constraints via standard syntax,
-- but the partial unique index above serves the same purpose.

-- Add index for faster duplicate payment lookups
CREATE INDEX "idx_order_status_lookup" 
ON "payments"("order_id", "status");
