CREATE TABLE IF NOT EXISTS "app_config" (
  "app_name" TEXT DEFAULT 'BarbeiroPro AI',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "super_admin_emails" TEXT DEFAULT '[]',
  "system_settings" TEXT DEFAULT '{}',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS "appointment" (
  "company_id" TEXT,
  "completed_at" TEXT,
  "confirm_token" TEXT DEFAULT (lower(hex(randomblob(24)))),
  "confirmed_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "customer_id" TEXT,
  "customer_name" TEXT,
  "customer_phone" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "notes" TEXT,
  "price" REAL,
  "professional_id" TEXT,
  "professional_name" TEXT,
  "scheduled_at" TEXT,
  "service_id" TEXT,
  "service_name" TEXT,
  "source" TEXT DEFAULT 'interno',
  "status" TEXT DEFAULT 'agendado',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_appointment_company_id ON "appointment"("company_id");
CREATE TABLE IF NOT EXISTS "billing_event_log" (
  "buyer_email" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "error" TEXT,
  "event_type" TEXT,
  "external_id" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "matched_company_id" TEXT,
  "payload" TEXT DEFAULT '{}',
  "processed" BOOLEAN DEFAULT 0,
  "provider" TEXT
);
CREATE TABLE IF NOT EXISTS "club_member" (
  "club_plan_id" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "current_period_end" TEXT,
  "customer_id" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "started_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "status" TEXT DEFAULT 'ativo',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_club_member_company_id ON "club_member"("company_id");
CREATE TABLE IF NOT EXISTS "club_plan" (
  "ativo" BOOLEAN DEFAULT 1,
  "beneficios" TEXT DEFAULT '[]',
  "checkout_url" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "nome" TEXT,
  "preco_cents" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_club_plan_company_id ON "club_plan"("company_id");
CREATE TABLE IF NOT EXISTS "company" (
  "business_hours" TEXT DEFAULT '{}',
  "ciclo" TEXT DEFAULT 'mensal',
  "cnpj" TEXT,
  "cpf_responsavel" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "created_by" TEXT,
  "email_contato" TEXT,
  "endereco" TEXT DEFAULT '{}',
  "fidelidade_ativa" BOOLEAN DEFAULT 0,
  "fidelidade_meta" REAL DEFAULT 10,
  "fidelidade_premio" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "logo_url" TEXT,
  "name" TEXT,
  "nome_fantasia" TEXT,
  "onboarding_concluido" BOOLEAN DEFAULT 0,
  "onboarding_step" REAL DEFAULT 0,
  "plano" TEXT DEFAULT 'starter',
  "primary_color" TEXT DEFAULT '#1B3A4B',
  "proximo_vencimento" TEXT,
  "razao_social" TEXT,
  "selected_plan_slug" TEXT,
  "slug" TEXT,
  "status_cobranca" TEXT DEFAULT 'trial',
  "telefone_comercial" TEXT,
  "trial_ate" TEXT DEFAULT (date('now','+14 days')),
  "ultimo_acesso_at" TEXT,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "valor_mensal" REAL DEFAULT 39,
  "whatsapp" TEXT
);
CREATE TABLE IF NOT EXISTS "company_user" (
  "ativo" BOOLEAN DEFAULT 1,
  "company_id" TEXT,
  "convite_aceito" BOOLEAN DEFAULT 0,
  "convite_token" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "email" TEXT,
  "forcar_troca_senha" BOOLEAN DEFAULT 0,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "nome" TEXT,
  "role" TEXT DEFAULT 'recepcao',
  "ultimo_login" TEXT,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "user_id" TEXT
);
CREATE INDEX IF NOT EXISTS idx_company_user_company_id ON "company_user"("company_id");
CREATE INDEX IF NOT EXISTS idx_company_user_user_id ON "company_user"("user_id");
CREATE TABLE IF NOT EXISTS "customer" (
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "email" TEXT,
  "fidelidade_contador" REAL DEFAULT 0,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "last_appointment_at" TEXT,
  "name" TEXT,
  "notes" TEXT DEFAULT '{}',
  "phone" TEXT,
  "status" TEXT DEFAULT 'active',
  "tags" TEXT DEFAULT '[]',
  "total_appointments" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_customer_company_id ON "customer"("company_id");
CREATE TABLE IF NOT EXISTS "financial_entry" (
  "amount" REAL,
  "category" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "date" TEXT,
  "description" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "reference_appointment_id" TEXT,
  "status" TEXT DEFAULT 'confirmado',
  "type" TEXT DEFAULT 'entrada',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_financial_entry_company_id ON "financial_entry"("company_id");
CREATE TABLE IF NOT EXISTS "invoice_simulated" (
  "amount" REAL,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "due_date" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "paid_at" TEXT,
  "reference_month" TEXT,
  "status" TEXT DEFAULT 'pendente'
);
CREATE INDEX IF NOT EXISTS idx_invoice_simulated_company_id ON "invoice_simulated"("company_id");
CREATE TABLE IF NOT EXISTS "plan" (
  "ativo" BOOLEAN DEFAULT 1,
  "checkout_url" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "descricao" TEXT,
  "destaque" BOOLEAN DEFAULT 0,
  "features" TEXT DEFAULT '[]',
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "intervalo" TEXT DEFAULT 'month',
  "limite_agendamentos_mes" REAL DEFAULT 1000,
  "limite_clientes" REAL DEFAULT 1000,
  "limite_profissionais" REAL DEFAULT 3,
  "limite_usuarios" REAL DEFAULT 3,
  "moeda" TEXT DEFAULT 'BRL',
  "nome" TEXT,
  "ordem" REAL DEFAULT 0,
  "preco_cents" REAL DEFAULT 0,
  "provider_price_ids" TEXT DEFAULT '{}',
  "slug" TEXT,
  "trial_days" REAL DEFAULT 14,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS "product" (
  "ativo" BOOLEAN DEFAULT 1,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "custo_cents" REAL DEFAULT 0,
  "estoque" REAL,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "nome" TEXT,
  "preco_cents" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_product_company_id ON "product"("company_id");
CREATE TABLE IF NOT EXISTS "professional" (
  "active" BOOLEAN DEFAULT 1,
  "comissao_percentual" REAL DEFAULT 0,
  "commission_type" TEXT,
  "commission_value" REAL,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "name" TEXT,
  "photo_url" TEXT,
  "specialty" TEXT,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "work_schedule" TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_professional_company_id ON "professional"("company_id");
CREATE TABLE IF NOT EXISTS "professional_service" (
  "comissao_percentual" REAL,
  "commission_type" TEXT,
  "commission_value" REAL,
  "professional_id" TEXT,
  "service_id" TEXT
);
CREATE TABLE IF NOT EXISTS "sale" (
  "appointment_id" TEXT,
  "closed_at" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "created_by" TEXT,
  "customer_id" TEXT,
  "desconto_cents" REAL DEFAULT 0,
  "forma_pagamento" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "observacao" TEXT,
  "professional_id" TEXT,
  "status" TEXT DEFAULT 'aberta',
  "total_cents" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sale_company_id ON "sale"("company_id");
CREATE TABLE IF NOT EXISTS "sale_item" (
  "comissao_cents" REAL DEFAULT 0,
  "comissao_percentual" REAL DEFAULT 0,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "descricao" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "preco_cents" REAL DEFAULT 0,
  "professional_id" TEXT,
  "quantidade" REAL DEFAULT 1,
  "ref_id" TEXT,
  "sale_id" TEXT,
  "tipo" TEXT
);
CREATE INDEX IF NOT EXISTS idx_sale_item_company_id ON "sale_item"("company_id");
CREATE TABLE IF NOT EXISTS "service" (
  "active" BOOLEAN DEFAULT 1,
  "category_id" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "description" TEXT,
  "duration_minutes" REAL DEFAULT 30,
  "featured" BOOLEAN DEFAULT 0,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "name" TEXT,
  "price" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_service_company_id ON "service"("company_id");
CREATE TABLE IF NOT EXISTS "service_category" (
  "active" BOOLEAN DEFAULT 1,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "name" TEXT,
  "sort_order" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_service_category_company_id ON "service_category"("company_id");
CREATE TABLE IF NOT EXISTS "subscription" (
  "buyer_email" TEXT,
  "cancel_at_period_end" BOOLEAN DEFAULT 0,
  "canceled_at" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "current_period_end" TEXT,
  "current_period_start" TEXT,
  "external_customer_id" TEXT,
  "external_subscription_id" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "metadata" TEXT DEFAULT '{}',
  "plan_id" TEXT,
  "provider" TEXT DEFAULT 'manual',
  "status" TEXT DEFAULT 'trialing',
  "trial_ends_at" TEXT,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_subscription_company_id ON "subscription"("company_id");
CREATE TABLE IF NOT EXISTS "trial_identity" (
  "company_id" TEXT,
  "cpf" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "email" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "phone" TEXT,
  "user_id" TEXT
);
CREATE INDEX IF NOT EXISTS idx_trial_identity_company_id ON "trial_identity"("company_id");
CREATE INDEX IF NOT EXISTS idx_trial_identity_user_id ON "trial_identity"("user_id");
CREATE TABLE IF NOT EXISTS "user_roles" (
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "role" TEXT,
  "user_id" TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON "user_roles"("user_id");
CREATE TABLE IF NOT EXISTS "profiles" (
  "user_id" TEXT PRIMARY KEY,
  "email" TEXT,
  "nome" TEXT
);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON "profiles"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS uniq_company_slug ON company(slug);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plan_slug ON plan(slug);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_roles_user_id_role ON user_roles(user_id,role);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_company_user_company_id_email ON company_user(company_id,email);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_professional_service_professional_id_service_id ON professional_service(professional_id,service_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_subscription_company_id ON subscription(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_appointment_confirm_token ON appointment(confirm_token);
CREATE TABLE IF NOT EXISTS template_owner(id TEXT PRIMARY KEY,user_id TEXT NOT NULL);
