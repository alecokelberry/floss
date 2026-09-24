CREATE TABLE "treatment_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"practitioner_id" text NOT NULL,
	"items" jsonb NOT NULL,
	"status" text NOT NULL,
	"presented_on" text NOT NULL,
	"decided_on" text
);
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "carrier" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "member_id" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "verified_on" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "recall_months" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "last_hygiene_on" text;--> statement-breakpoint
ALTER TABLE "procedures" ADD COLUMN "code" text DEFAULT '' NOT NULL;--> statement-breakpoint
-- A database seeded before codes: each procedure gets its CDT code, then the column has no default
UPDATE "procedures" SET "code" = case "id"
  when 'checkup' then 'D0120'
  when 'scaling' then 'D1110'
  when 'whitening' then 'D9972'
  when 'filling' then 'D2391'
  when 'root-canal' then 'D3330'
  when 'extraction' then 'D7140'
  when 'crown' then 'D2740'
  when 'braces' then 'D8670'
  when 'ortho-consult' then 'D8660'
  when 'implant-place' then 'D6010'
  when 'implant' then 'D0171'
  when 'srp' then 'D4341'
  when 'perio-maint' then 'D4910'
  when 'veneer' then 'D2962'
  when 'denture' then 'D5110'
  else "code" end;--> statement-breakpoint
ALTER TABLE "procedures" ALTER COLUMN "code" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "treatment_plans_patient" ON "treatment_plans" USING btree ("patient_id");--> statement-breakpoint
select watch_writes('treatment_plans');
