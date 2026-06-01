-- Prevent payment status reversal from PAID to UNPAID at the database layer.
-- Application code already blocks this transition; the trigger protects direct writes and bypasses.

CREATE OR REPLACE FUNCTION prevent_paid_to_unpaid_payment_status_reversal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."payment_status" = 'PAID'::"PaymentStatus"
     AND NEW."payment_status" = 'UNPAID'::"PaymentStatus" THEN
    RAISE EXCEPTION 'Payment status cannot be changed once marked as PAID';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "orders_prevent_paid_to_unpaid_payment_status_reversal" ON "orders";

CREATE TRIGGER "orders_prevent_paid_to_unpaid_payment_status_reversal"
BEFORE UPDATE OF "payment_status" ON "orders"
FOR EACH ROW
EXECUTE FUNCTION prevent_paid_to_unpaid_payment_status_reversal();
