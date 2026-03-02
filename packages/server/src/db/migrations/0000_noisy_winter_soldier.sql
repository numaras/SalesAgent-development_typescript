CREATE TABLE "adapter_config" (
	"tenant_id" varchar(50) PRIMARY KEY NOT NULL,
	"adapter_type" varchar(50) NOT NULL,
	"mock_dry_run" boolean,
	"mock_manual_approval_required" boolean DEFAULT false NOT NULL,
	"gam_network_code" varchar(50),
	"gam_refresh_token" text,
	"gam_service_account_json" text,
	"gam_service_account_email" varchar(255),
	"gam_auth_method" varchar(50) DEFAULT 'oauth' NOT NULL,
	"gam_trafficker_id" varchar(50),
	"gam_network_currency" varchar(3),
	"gam_secondary_currencies" jsonb,
	"gam_network_timezone" varchar(100),
	"gam_manual_approval_required" boolean DEFAULT false NOT NULL,
	"gam_order_name_template" varchar(500),
	"gam_line_item_name_template" varchar(500),
	"axe_include_key" varchar(100),
	"axe_exclude_key" varchar(100),
	"axe_macro_key" varchar(100),
	"custom_targeting_keys" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"kevel_network_id" varchar(50),
	"kevel_api_key" varchar(100),
	"kevel_manual_approval_required" boolean DEFAULT false NOT NULL,
	"triton_station_id" varchar(50),
	"triton_api_key" varchar(100),
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"agent_url" varchar(500) NOT NULL,
	"name" varchar(200) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 10 NOT NULL,
	"auth_type" varchar(50),
	"auth_header" varchar(100),
	"auth_credentials" text,
	"timeout" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "signals_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"agent_url" varchar(500) NOT NULL,
	"name" varchar(200) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"auth_type" varchar(50),
	"auth_header" varchar(100),
	"auth_credentials" text,
	"forward_promoted_offering" boolean DEFAULT true NOT NULL,
	"timeout" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"operation" varchar(100) NOT NULL,
	"principal_name" varchar(255),
	"principal_id" varchar(50),
	"adapter_id" varchar(50),
	"success" boolean NOT NULL,
	"error_message" text,
	"details" jsonb,
	"strategy_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "authorized_properties" (
	"property_id" varchar(100) NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"property_type" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"identifiers" jsonb NOT NULL,
	"tags" jsonb,
	"publisher_domain" varchar(255) NOT NULL,
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"verification_checked_at" timestamp with time zone,
	"verification_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authorized_properties_property_id_tenant_id_pk" PRIMARY KEY("property_id","tenant_id"),
	CONSTRAINT "ck_property_type" CHECK ("authorized_properties"."property_type" IN ('website', 'mobile_app', 'ctv_app', 'dooh', 'podcast', 'radio', 'streaming_audio')),
	CONSTRAINT "ck_verification_status" CHECK ("authorized_properties"."verification_status" IN ('pending', 'verified', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "contexts" (
	"context_id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"principal_id" varchar(50) NOT NULL,
	"conversation_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_reviews" (
	"review_id" varchar(100) PRIMARY KEY NOT NULL,
	"creative_id" varchar(100) NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"review_type" varchar(20) NOT NULL,
	"reviewer_email" varchar(255),
	"ai_decision" varchar(20),
	"confidence_score" double precision,
	"policy_triggered" varchar(100),
	"reason" text,
	"recommendations" jsonb,
	"human_override" boolean DEFAULT false NOT NULL,
	"final_decision" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creatives" (
	"creative_id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"principal_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"agent_url" varchar(500) NOT NULL,
	"format" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"format_parameters" jsonb,
	"group_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT current_timestamp,
	"updated_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" varchar(255),
	"strategy_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "currency_limits" (
	"tenant_id" varchar(50) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"min_package_budget" numeric(15, 2),
	"max_daily_package_spend" numeric(15, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "currency_limits_tenant_id_currency_code_pk" PRIMARY KEY("tenant_id","currency_code")
);
--> statement-breakpoint
CREATE TABLE "gam_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"inventory_type" varchar(30) NOT NULL,
	"inventory_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"path" jsonb,
	"status" varchar(20) NOT NULL,
	"inventory_metadata" jsonb,
	"last_synced" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gam_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"line_item_id" varchar(50) NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(30) NOT NULL,
	"line_item_type" varchar(30) NOT NULL,
	"priority" integer,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"unlimited_end_date" boolean DEFAULT false NOT NULL,
	"auto_extension_days" integer,
	"cost_type" varchar(20),
	"cost_per_unit" double precision,
	"discount_type" varchar(20),
	"discount" double precision,
	"contracted_units_bought" integer,
	"delivery_rate_type" varchar(30),
	"goal_type" varchar(20),
	"primary_goal_type" varchar(20),
	"primary_goal_units" integer,
	"impression_limit" integer,
	"click_limit" integer,
	"target_platform" varchar(20),
	"environment_type" varchar(20),
	"allow_overbook" boolean DEFAULT false NOT NULL,
	"skip_inventory_check" boolean DEFAULT false NOT NULL,
	"reserve_at_creation" boolean DEFAULT false NOT NULL,
	"stats_impressions" integer,
	"stats_clicks" integer,
	"stats_ctr" double precision,
	"stats_video_completions" integer,
	"stats_video_starts" integer,
	"stats_viewable_impressions" integer,
	"delivery_indicator_type" varchar(30),
	"delivery_data" jsonb,
	"targeting" jsonb,
	"creative_placeholders" jsonb,
	"frequency_caps" jsonb,
	"applied_labels" jsonb,
	"effective_applied_labels" jsonb,
	"custom_field_values" jsonb,
	"third_party_measurement_settings" jsonb,
	"video_max_duration" integer,
	"line_item_metadata" jsonb,
	"last_modified_date" timestamp with time zone,
	"creation_date" timestamp with time zone,
	"external_id" varchar(255),
	"last_synced" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gam_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"advertiser_id" varchar(50),
	"advertiser_name" varchar(255),
	"agency_id" varchar(50),
	"agency_name" varchar(255),
	"trafficker_id" varchar(50),
	"trafficker_name" varchar(255),
	"salesperson_id" varchar(50),
	"salesperson_name" varchar(255),
	"status" varchar(20) NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"unlimited_end_date" boolean DEFAULT false NOT NULL,
	"total_budget" double precision,
	"currency_code" varchar(10),
	"external_order_id" varchar(100),
	"po_number" varchar(100),
	"notes" text,
	"last_modified_date" timestamp with time zone,
	"is_programmatic" boolean DEFAULT false NOT NULL,
	"applied_labels" jsonb,
	"effective_applied_labels" jsonb,
	"custom_field_values" jsonb,
	"order_metadata" jsonb,
	"last_synced" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"tenant_id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"subdomain" varchar(100) NOT NULL,
	"virtual_host" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"billing_plan" varchar(50) DEFAULT 'standard' NOT NULL,
	"billing_contact" varchar(255),
	"ad_server" varchar(50),
	"enable_axe_signals" boolean DEFAULT true NOT NULL,
	"authorized_emails" jsonb,
	"authorized_domains" jsonb,
	"slack_webhook_url" varchar(500),
	"slack_audit_webhook_url" varchar(500),
	"hitl_webhook_url" varchar(500),
	"admin_token" varchar(100),
	"auto_approve_format_ids" jsonb,
	"human_review_required" boolean DEFAULT true NOT NULL,
	"policy_settings" jsonb,
	"signals_agent_config" jsonb,
	"creative_review_criteria" text,
	"gemini_api_key" varchar(500),
	"approval_mode" varchar(50) DEFAULT 'require-human' NOT NULL,
	"creative_auto_approve_threshold" double precision DEFAULT 0.9 NOT NULL,
	"creative_auto_reject_threshold" double precision DEFAULT 0.1 NOT NULL,
	"ai_policy" jsonb,
	"advertising_policy" jsonb,
	"ai_config" jsonb,
	"order_name_template" varchar(500) DEFAULT '{campaign_name|brand_name} - {buyer_ref} - {date_range}',
	"line_item_name_template" varchar(500) DEFAULT '{order_name} - {product_name}',
	"measurement_providers" jsonb,
	"brand_manifest_policy" varchar(50) DEFAULT 'require_auth' NOT NULL,
	"auth_setup_mode" boolean DEFAULT true NOT NULL,
	"product_ranking_prompt" text,
	"favicon_url" varchar(500),
	CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "principals" (
	"tenant_id" varchar(50) NOT NULL,
	"principal_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"platform_mappings" jsonb NOT NULL,
	"access_token" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "principals_tenant_id_principal_id_pk" PRIMARY KEY("tenant_id","principal_id"),
	CONSTRAINT "principals_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"tenant_id" varchar(50) NOT NULL,
	"product_id" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"format_ids" jsonb NOT NULL,
	"targeting_template" jsonb NOT NULL,
	"delivery_type" varchar(50) NOT NULL,
	"measurement" jsonb,
	"creative_policy" jsonb,
	"price_guidance" jsonb,
	"is_custom" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"countries" jsonb,
	"channels" jsonb,
	"implementation_config" jsonb,
	"properties" jsonb,
	"property_ids" jsonb,
	"property_tags" jsonb,
	"inventory_profile_id" integer,
	"delivery_measurement" jsonb,
	"product_card" jsonb,
	"product_card_detailed" jsonb,
	"placements" jsonb,
	"reporting_capabilities" jsonb,
	"is_dynamic" boolean DEFAULT false NOT NULL,
	"is_dynamic_variant" boolean DEFAULT false NOT NULL,
	"parent_product_id" varchar(100),
	"signals_agent_ids" jsonb,
	"variant_name_template" varchar(500),
	"variant_description_template" text,
	"max_signals" integer DEFAULT 5 NOT NULL,
	"activation_key" jsonb,
	"signal_metadata" jsonb,
	"last_synced_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"variant_ttl_days" integer,
	"allowed_principal_ids" jsonb,
	CONSTRAINT "products_tenant_id_product_id_pk" PRIMARY KEY("tenant_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "media_buys" (
	"media_buy_id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"principal_id" varchar(50) NOT NULL,
	"buyer_ref" varchar(100),
	"order_name" varchar(255) NOT NULL,
	"advertiser_name" varchar(255) NOT NULL,
	"campaign_objective" varchar(100),
	"kpi_goal" varchar(255),
	"budget" numeric(15, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" varchar(255),
	"raw_request" jsonb NOT NULL,
	"strategy_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "media_packages" (
	"media_buy_id" varchar(100) NOT NULL,
	"package_id" varchar(100) NOT NULL,
	"budget" numeric(15, 2),
	"bid_price" numeric(15, 2),
	"package_config" jsonb
);
--> statement-breakpoint
CREATE TABLE "object_workflow_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_type" varchar(50) NOT NULL,
	"object_id" varchar(100) NOT NULL,
	"step_id" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"step_id" varchar(100) PRIMARY KEY NOT NULL,
	"context_id" varchar(100) NOT NULL,
	"step_type" varchar(50) NOT NULL,
	"tool_name" varchar(100),
	"request_data" jsonb,
	"response_data" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"owner" varchar(20) NOT NULL,
	"assigned_to" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"transaction_details" jsonb,
	"comments" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_tags" (
	"tag_id" varchar(50) NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_tags_tag_id_tenant_id_pk" PRIMARY KEY("tag_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "publisher_partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"publisher_domain" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"is_verified" boolean DEFAULT false NOT NULL,
	"last_synced_at" timestamp with time zone,
	"sync_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sync_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_sync_status" CHECK ("publisher_partners"."sync_status" IN ('pending', 'success', 'error'))
);
--> statement-breakpoint
CREATE TABLE "tenant_auth_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"oidc_enabled" boolean DEFAULT false NOT NULL,
	"oidc_provider" varchar(50),
	"oidc_discovery_url" varchar(500),
	"oidc_client_id" varchar(500),
	"oidc_client_secret_encrypted" text,
	"oidc_scopes" varchar(500) DEFAULT 'openid email profile',
	"oidc_logout_url" varchar(500),
	"oidc_verified_at" timestamp with time zone,
	"oidc_verified_redirect_uri" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "tenant_auth_configs_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" varchar(50) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(200) NOT NULL,
	"role" varchar(20) NOT NULL,
	"google_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"last_login" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ck_users_role" CHECK ("users"."role" IN ('admin', 'manager', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "inventory_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"profile_id" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"inventory_config" jsonb NOT NULL,
	"format_ids" jsonb NOT NULL,
	"publisher_properties" jsonb NOT NULL,
	"targeting_template" jsonb,
	"gam_preset_id" varchar(100),
	"gam_preset_sync_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_notification_configs" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"principal_id" varchar(50) NOT NULL,
	"session_id" varchar(100),
	"url" text NOT NULL,
	"authentication_type" varchar(50),
	"authentication_token" text,
	"validation_token" text,
	"webhook_secret" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "superadmin_config" (
	"config_key" varchar(100) PRIMARY KEY NOT NULL,
	"config_value" text,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"sync_id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"adapter_type" varchar(50) NOT NULL,
	"sync_type" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"summary" text,
	"error_message" text,
	"triggered_by" varchar(50) NOT NULL,
	"triggered_by_id" varchar(255),
	"progress" text
);
--> statement-breakpoint
CREATE TABLE "product_inventory_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"product_id" varchar(50) NOT NULL,
	"inventory_type" varchar(30) NOT NULL,
	"inventory_id" varchar(50) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adapter_config" ADD CONSTRAINT "adapter_config_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_agents" ADD CONSTRAINT "creative_agents_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals_agents" ADD CONSTRAINT "signals_agents_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorized_properties" ADD CONSTRAINT "authorized_properties_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contexts" ADD CONSTRAINT "contexts_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_reviews" ADD CONSTRAINT "creative_reviews_creative_id_creatives_creative_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("creative_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_reviews" ADD CONSTRAINT "creative_reviews_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_limits" ADD CONSTRAINT "currency_limits_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gam_inventory" ADD CONSTRAINT "gam_inventory_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gam_line_items" ADD CONSTRAINT "gam_line_items_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gam_orders" ADD CONSTRAINT "gam_orders_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principals" ADD CONSTRAINT "principals_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_buys" ADD CONSTRAINT "media_buys_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_packages" ADD CONSTRAINT "media_packages_media_buy_id_media_buys_media_buy_id_fk" FOREIGN KEY ("media_buy_id") REFERENCES "public"."media_buys"("media_buy_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_workflow_mapping" ADD CONSTRAINT "object_workflow_mapping_step_id_workflow_steps_step_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("step_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_tags" ADD CONSTRAINT "property_tags_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_partners" ADD CONSTRAINT "publisher_partners_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_auth_configs" ADD CONSTRAINT "tenant_auth_configs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_profiles" ADD CONSTRAINT "inventory_profiles_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notification_configs" ADD CONSTRAINT "push_notification_configs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inventory_mappings" ADD CONSTRAINT "product_inventory_mappings_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_adapter_config_type" ON "adapter_config" USING btree ("adapter_type");--> statement-breakpoint
CREATE INDEX "idx_creative_agents_tenant" ON "creative_agents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_creative_agents_enabled" ON "creative_agents" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_signals_agents_tenant" ON "signals_agents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_signals_agents_enabled" ON "signals_agents" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_tenant" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_strategy" ON "audit_logs" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX "idx_authorized_properties_tenant" ON "authorized_properties" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_authorized_properties_domain" ON "authorized_properties" USING btree ("publisher_domain");--> statement-breakpoint
CREATE INDEX "idx_authorized_properties_type" ON "authorized_properties" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "idx_authorized_properties_verification" ON "authorized_properties" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_contexts_tenant" ON "contexts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_contexts_principal" ON "contexts" USING btree ("principal_id");--> statement-breakpoint
CREATE INDEX "idx_contexts_last_activity" ON "contexts" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "ix_creative_reviews_creative_id" ON "creative_reviews" USING btree ("creative_id");--> statement-breakpoint
CREATE INDEX "ix_creative_reviews_tenant_id" ON "creative_reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_creatives_tenant" ON "creatives" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_creatives_principal" ON "creatives" USING btree ("tenant_id","principal_id");--> statement-breakpoint
CREATE INDEX "idx_creatives_status" ON "creatives" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_creatives_format_namespace" ON "creatives" USING btree ("agent_url","format");--> statement-breakpoint
CREATE INDEX "idx_currency_limits_tenant" ON "currency_limits" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_gam_inventory" ON "gam_inventory" USING btree ("tenant_id","inventory_type","inventory_id");--> statement-breakpoint
CREATE INDEX "idx_gam_inventory_tenant" ON "gam_inventory" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_gam_inventory_type" ON "gam_inventory" USING btree ("inventory_type");--> statement-breakpoint
CREATE INDEX "idx_gam_inventory_status" ON "gam_inventory" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_gam_line_items" ON "gam_line_items" USING btree ("tenant_id","line_item_id");--> statement-breakpoint
CREATE INDEX "idx_gam_line_items_tenant" ON "gam_line_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_gam_line_items_line_item_id" ON "gam_line_items" USING btree ("line_item_id");--> statement-breakpoint
CREATE INDEX "idx_gam_line_items_order_id" ON "gam_line_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_gam_line_items_status" ON "gam_line_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gam_line_items_type" ON "gam_line_items" USING btree ("line_item_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_gam_orders" ON "gam_orders" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_gam_orders_tenant" ON "gam_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_gam_orders_order_id" ON "gam_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_gam_orders_status" ON "gam_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gam_orders_advertiser" ON "gam_orders" USING btree ("advertiser_id");--> statement-breakpoint
CREATE INDEX "idx_principals_tenant" ON "principals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_principals_token" ON "principals" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX "idx_media_buys_tenant" ON "media_buys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_media_buys_status" ON "media_buys" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_media_buys_strategy" ON "media_buys" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX "idx_media_buys_buyer_ref" ON "media_buys" USING btree ("buyer_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_media_buys_buyer_ref" ON "media_buys" USING btree ("tenant_id","principal_id","buyer_ref");--> statement-breakpoint
CREATE INDEX "idx_media_packages_buy" ON "media_packages" USING btree ("media_buy_id");--> statement-breakpoint
CREATE INDEX "idx_object_workflow_type_id" ON "object_workflow_mapping" USING btree ("object_type","object_id");--> statement-breakpoint
CREATE INDEX "idx_object_workflow_step" ON "object_workflow_mapping" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "idx_object_workflow_created" ON "object_workflow_mapping" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_steps_context" ON "workflow_steps" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_steps_status" ON "workflow_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workflow_steps_owner" ON "workflow_steps" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "idx_workflow_steps_assigned" ON "workflow_steps" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_workflow_steps_created" ON "workflow_steps" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_property_tags_tenant" ON "property_tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_publisher" ON "publisher_partners" USING btree ("tenant_id","publisher_domain");--> statement-breakpoint
CREATE INDEX "idx_publisher_partners_tenant" ON "publisher_partners" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_publisher_partners_domain" ON "publisher_partners" USING btree ("publisher_domain");--> statement-breakpoint
CREATE INDEX "idx_publisher_partners_verified" ON "publisher_partners" USING btree ("is_verified");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenant_auth_configs_tenant_id" ON "tenant_auth_configs" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_tenant_email" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "idx_users_tenant" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_google_id" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_profile" ON "inventory_profiles" USING btree ("tenant_id","profile_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_profiles_tenant" ON "inventory_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_push_notification_configs_tenant" ON "push_notification_configs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_push_notification_configs_principal" ON "push_notification_configs" USING btree ("tenant_id","principal_id");--> statement-breakpoint
CREATE INDEX "idx_sync_jobs_tenant" ON "sync_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sync_jobs_status" ON "sync_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sync_jobs_started" ON "sync_jobs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_product_inventory_mapping" ON "product_inventory_mappings" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_inventory" ON "product_inventory_mappings" USING btree ("tenant_id","product_id","inventory_type","inventory_id");