CREATE TABLE "creative_assignments" (
	"id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"creative_id" varchar(100) NOT NULL,
	"media_buy_id" varchar(100) NOT NULL,
	"package_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creative_assignments" ADD CONSTRAINT "creative_assignments_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_assignments" ADD CONSTRAINT "creative_assignments_creative_id_creatives_creative_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("creative_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "creative_assignments" ADD CONSTRAINT "creative_assignments_media_buy_id_media_buys_media_buy_id_fk" FOREIGN KEY ("media_buy_id") REFERENCES "public"."media_buys"("media_buy_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_creative_assignments_tenant" ON "creative_assignments" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_creative_assignments_media_buy" ON "creative_assignments" USING btree ("media_buy_id");
--> statement-breakpoint
CREATE INDEX "idx_creative_assignments_creative" ON "creative_assignments" USING btree ("creative_id");
--> statement-breakpoint
CREATE INDEX "idx_creative_assignments_package" ON "creative_assignments" USING btree ("package_id");
