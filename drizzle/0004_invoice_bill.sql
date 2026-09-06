ALTER TABLE "bookings" ALTER COLUMN "fee" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "bill" text;