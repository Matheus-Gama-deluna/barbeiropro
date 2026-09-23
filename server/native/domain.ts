// Generated from preserved source by scripts/native/port-domain.mjs. No runtime eval.
import * as external0 from "zod"
export const publicRoutes={"/api/public/billing/webhook":"src/routes/api/public/billing/webhook"} as Record<string,string>
export const rpcAllowlist={"src/lib/auth-signup.functions":["checkEmailExists","signupTrial"],"src/lib/billing.functions":["getBillingWebhookInfo","regenerateWebhookToken","listBillingEvents"],"src/lib/master.functions":["createBarbershopWithOwner","setSuperAdminEmails","setAppBrand"],"src/lib/users.functions":["signUpInterno","resetAdminPassword","createTeamMember","updateTeamMemberRole","setTeamMemberActive","resetTeamMemberPassword","removeTeamMember"]} as Record<string,string[]>
const factories:Record<string,Function>={"src/lib/auth-signup.functions": (module:any,exports:any,require:any,process:any)=>{
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupTrial = exports.checkEmailExists = void 0;
const react_start_1 = require("@tanstack/react-start");
const zod_1 = require("zod");
const auth_signup_server_1 = require("src/lib/auth-signup.server");
const CheckEmailSchema = zod_1.z.object({ email: zod_1.z.string().trim().email().max(255) });
exports.checkEmailExists = (0, react_start_1.createServerFn)({ method: "POST" })
    .inputValidator((input) => CheckEmailSchema.parse(input))
    .handler(async ({ data }) => {
    const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require("@/integrations/supabase/client.server")));
    const email = data.email.toLowerCase();
    // Busca paginada
    let page = 1;
    for (;;) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error)
            throw new Error(error.message);
        const found = list?.users.find((u) => (u.email ?? "").toLowerCase() === email);
        if (found)
            return { exists: true };
        if (!list?.users || list.users.length < 200)
            return { exists: false };
        page += 1;
        if (page > 25)
            return { exists: false };
    }
});
const SignupTrialSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email().max(255),
    password: zod_1.z.string().min(6).max(72),
    nome: zod_1.z.string().trim().min(2).max(200),
    cpf: zod_1.z.string().min(11).max(20),
    phone: zod_1.z.string().min(10).max(20),
    plan_slug: zod_1.z.string().trim().max(80).optional(),
});
// Rate limit simples em memória
const _attempts = new Map();
function rateLimit(key) {
    const now = Date.now();
    const list = (_attempts.get(key) ?? []).filter((t) => now - t < 10 * 60 * 1000);
    if (list.length >= 5)
        throw new Error("Muitas tentativas. Aguarde alguns minutos.");
    list.push(now);
    _attempts.set(key, list);
}
exports.signupTrial = (0, react_start_1.createServerFn)({ method: "POST" })
    .inputValidator((input) => SignupTrialSchema.parse(input))
    .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const cpf = (0, auth_signup_server_1.onlyDigits)(data.cpf);
    const phone = (0, auth_signup_server_1.normalizePhone)(data.phone);
    if (!(0, auth_signup_server_1.isValidCPF)(cpf))
        throw new Error("CPF inválido.");
    if (!phone)
        throw new Error("Telefone inválido. Use DDD + número.");
    rateLimit(email);
    rateLimit(cpf);
    const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require("@/integrations/supabase/client.server")));
    // 1) Anti-fraude: já existe trial com esses dados?
    const { data: conflict, error: cErr } = await supabaseAdmin.rpc("trial_identity_conflict", { _email: email, _cpf: cpf, _phone: phone });
    if (cErr)
        throw new Error(cErr.message);
    if (conflict) {
        const map = {
            email: "Já existe uma conta com este email. Faça login.",
            cpf: "Já existe uma conta cadastrada com este CPF.",
            phone: "Já existe uma conta cadastrada com este telefone.",
        };
        throw new Error(map[conflict] ?? "Dados já cadastrados.");
    }
    // 2) Busca plano (se passado)
    let trialDays = 14;
    let planId = null;
    if (data.plan_slug) {
        const { data: plan } = await supabaseAdmin
            .from("plan")
            .select("id, trial_days")
            .eq("slug", data.plan_slug)
            .eq("ativo", true)
            .maybeSingle();
        if (plan) {
            planId = plan.id;
            if (plan.trial_days && plan.trial_days > 0)
                trialDays = plan.trial_days;
        }
    }
    // 3) Cria usuário
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { nome: data.nome, cpf, phone },
    });
    if (createErr)
        throw new Error(createErr.message);
    const userId = created.user?.id;
    if (!userId)
        throw new Error("Falha ao criar usuário.");
    // 4) Cria company com trial
    const trialAte = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    const { data: company, error: companyErr } = await supabaseAdmin
        .from("company")
        .insert({
        name: data.nome,
        nome_fantasia: data.nome,
        email_contato: email,
        telefone_comercial: phone,
        cpf_responsavel: cpf,
        status_cobranca: "trial",
        trial_ate: trialAte,
        selected_plan_slug: data.plan_slug ?? null,
        created_by: userId,
    })
        .select("id")
        .single();
    if (companyErr) {
        // rollback do user
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(companyErr.message);
    }
    // 5) Vincula owner
    const { error: cuErr } = await supabaseAdmin.from("company_user").insert({
        company_id: company.id,
        user_id: userId,
        email,
        nome: data.nome,
        role: "owner",
        ativo: true,
        convite_aceito: true,
        forcar_troca_senha: false,
    });
    if (cuErr) {
        await supabaseAdmin.from("company").delete().eq("id", company.id);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(cuErr.message);
    }
    // 6) Cria subscription trial (se houver plano)
    if (planId) {
        await supabaseAdmin.from("subscription").insert({
            company_id: company.id,
            plan_id: planId,
            status: "trialing",
            buyer_email: email,
            trial_ends_at: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
        });
    }
    // 7) Registra identity (lock anti-fraude)
    const { error: tiErr } = await supabaseAdmin.from("trial_identity").insert({
        user_id: userId,
        company_id: company.id,
        email,
        cpf,
        phone,
    });
    if (tiErr) {
        // Não deleta os outros — apenas avisa; lock é best-effort
        console.error("trial_identity insert failed:", tiErr.message);
    }
    return { ok: true, company_id: company.id, trial_ate: trialAte };
});

},
"src/lib/auth-signup.server": (module:any,exports:any,require:any,process:any)=>{
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlyDigits = onlyDigits;
exports.normalizePhone = normalizePhone;
exports.isValidCPF = isValidCPF;
// Helpers server-only para validação e normalização do signup com trial
function onlyDigits(s) {
    return (s ?? "").replace(/\D/g, "");
}
function normalizePhone(raw) {
    const d = onlyDigits(raw);
    if (d.length < 10 || d.length > 13)
        return "";
    return d;
}
function isValidCPF(raw) {
    const cpf = onlyDigits(raw);
    if (cpf.length !== 11)
        return false;
    if (/^(\d)\1{10}$/.test(cpf))
        return false;
    const calc = (slice) => {
        let sum = 0;
        for (let i = 0; i < slice; i++)
            sum += parseInt(cpf[i], 10) * (slice + 1 - i);
        const r = (sum * 10) % 11;
        return r === 10 ? 0 : r;
    };
    return calc(9) === parseInt(cpf[9], 10) && calc(10) === parseInt(cpf[10], 10);
}

},
"src/lib/billing.functions": (module:any,exports:any,require:any,process:any)=>{
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBillingEvents = exports.regenerateWebhookToken = exports.getBillingWebhookInfo = void 0;
const react_start_1 = require("@tanstack/react-start");
const zod_1 = require("zod");
const auth_middleware_1 = require("@/integrations/supabase/auth-middleware");
const client_server_1 = require("@/integrations/supabase/client.server");
const PROVIDERS = ["kiwify", "cakto", "perfectpay", "hotmart", "kirvano"];
function randomToken(len = 24) {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(len));
    let out = "";
    for (let i = 0; i < len; i++)
        out += chars[bytes[i] % chars.length];
    return out;
}
async function assertSuperAdmin(ctx) {
    const { data: isAdmin, error } = await ctx.supabase.rpc("is_super_admin");
    if (error)
        throw new Error(error.message);
    if (!isAdmin)
        throw new Error("Apenas super admin.");
}
async function loadOrInitConfig() {
    const { data: existing } = await client_server_1.supabaseAdmin
        .from("app_config")
        .select("id, system_settings")
        .limit(1)
        .maybeSingle();
    if (existing?.id)
        return existing;
    const { data: created } = await client_server_1.supabaseAdmin
        .from("app_config")
        .insert({ app_name: "BarbeiroPro AI", super_admin_emails: [], system_settings: {} })
        .select("id, system_settings")
        .single();
    return created;
}
async function ensureTokens() {
    const cfg = await loadOrInitConfig();
    const settings = cfg.system_settings ?? {};
    const current = settings.webhook_tokens ?? {};
    let changed = false;
    const out = { ...current };
    for (const p of PROVIDERS) {
        if (!out[p]) {
            out[p] = randomToken(24);
            changed = true;
        }
    }
    if (changed) {
        await client_server_1.supabaseAdmin
            .from("app_config")
            .update({ system_settings: { ...settings, webhook_tokens: out } })
            .eq("id", cfg.id);
    }
    return out;
}
exports.getBillingWebhookInfo = (0, react_start_1.createServerFn)({ method: "GET" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const tokens = await ensureTokens();
    const baseUrl = "https://" + process.env.BLINK_PROJECT_ID.slice(-8) + ".backend.blink.new";
    return { baseUrl, tokens };
});
exports.regenerateWebhookToken = (0, react_start_1.createServerFn)({ method: "POST" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .inputValidator((input) => zod_1.z.object({ provider: zod_1.z.enum(PROVIDERS) }).parse(input))
    .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const cfg = await loadOrInitConfig();
    const settings = cfg.system_settings ?? {};
    const current = settings.webhook_tokens ?? {};
    const next = randomToken(24);
    current[data.provider] = next;
    await client_server_1.supabaseAdmin
        .from("app_config")
        .update({ system_settings: { ...settings, webhook_tokens: current } })
        .eq("id", cfg.id);
    return { provider: data.provider, token: next };
});
exports.listBillingEvents = (0, react_start_1.createServerFn)({ method: "GET" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data } = await client_server_1.supabaseAdmin
        .from("billing_event_log")
        .select("id, provider, event_type, buyer_email, matched_company_id, processed, error, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
    return { events: data ?? [] };
});

},
"src/lib/master.functions": (module:any,exports:any,require:any,process:any)=>{
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAppBrand = exports.setSuperAdminEmails = exports.createBarbershopWithOwner = void 0;
const react_start_1 = require("@tanstack/react-start");
const zod_1 = require("zod");
const auth_middleware_1 = require("@/integrations/supabase/auth-middleware");
const client_server_1 = require("@/integrations/supabase/client.server");
function slugify(s) {
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}
function generateTempPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    let out = "";
    for (let i = 0; i < 12; i++)
        out += chars[bytes[i] % chars.length];
    return out;
}
const EnderecoSchema = zod_1.z
    .object({
    cep: zod_1.z.string().max(20).optional().default(""),
    logradouro: zod_1.z.string().max(200).optional().default(""),
    numero: zod_1.z.string().max(20).optional().default(""),
    complemento: zod_1.z.string().max(100).optional().default(""),
    bairro: zod_1.z.string().max(100).optional().default(""),
    cidade: zod_1.z.string().max(100).optional().default(""),
    uf: zod_1.z.string().max(2).optional().default(""),
})
    .partial()
    .default({});
const BusinessHoursSchema = zod_1.z
    .record(zod_1.z.string(), zod_1.z.object({
    open: zod_1.z.boolean(),
    from: zod_1.z.string().max(5).optional().default(""),
    to: zod_1.z.string().max(5).optional().default(""),
}))
    .default({});
const InputSchema = zod_1.z.object({
    // identificação
    name: zod_1.z.string().trim().min(1).max(200),
    nome_fantasia: zod_1.z.string().trim().min(1).max(200),
    cnpj: zod_1.z.string().trim().max(20).optional().default(""),
    logo_url: zod_1.z.string().trim().max(500).optional().default(""),
    // contato
    email_contato: zod_1.z.string().trim().email().max(255),
    telefone_comercial: zod_1.z.string().trim().max(40).optional().default(""),
    whatsapp: zod_1.z.string().trim().max(40).optional().default(""),
    endereco: EnderecoSchema,
    // página pública
    slug: zod_1.z.string().trim().max(80).optional().default(""),
    primary_color: zod_1.z.string().trim().max(20).optional().default("#1B3A4B"),
    // horários
    business_hours: BusinessHoursSchema,
    // plano e cobrança
    plano: zod_1.z.enum(["starter", "pro", "premium"]).default("starter"),
    ciclo: zod_1.z.enum(["mensal", "anual"]).default("mensal"),
    valor_mensal: zod_1.z.number().min(0).max(99999).default(49),
    status_cobranca: zod_1.z
        .enum(["trial", "ativo", "inadimplente", "suspenso", "cancelado"])
        .default("trial"),
    trial_ate: zod_1.z.string().trim().max(20).optional().default(""),
    // admin
    nome_admin: zod_1.z.string().trim().max(200).optional().default(""),
    email_admin: zod_1.z.string().trim().email().max(255),
});
exports.createBarbershopWithOwner = (0, react_start_1.createServerFn)({ method: "POST" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .inputValidator((input) => InputSchema.parse(input))
    .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
    if (adminErr)
        throw new Error(adminErr.message);
    if (!isAdmin)
        throw new Error("Apenas super admin pode cadastrar barbearias.");
    const email = data.email_admin.toLowerCase();
    const slug = data.slug || slugify(data.nome_fantasia || data.name);
    // valida unicidade do slug
    const { data: existingSlug } = await client_server_1.supabaseAdmin
        .from("company")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
    if (existingSlug)
        throw new Error(`Slug "${slug}" já está em uso. Escolha outro.`);
    const { data: profile } = await client_server_1.supabaseAdmin.from("profiles").select("user_id").eq("email", email).maybeSingle();
    const userId = profile?.user_id || null;
    const tempPassword = "Entre com sua conta Blink usando este e-mail";
    const { data: company, error: companyErr } = await client_server_1.supabaseAdmin
        .from("company")
        .insert({
        name: data.name,
        nome_fantasia: data.nome_fantasia,
        cnpj: data.cnpj || null,
        logo_url: data.logo_url || null,
        email_contato: data.email_contato.toLowerCase(),
        telefone_comercial: data.telefone_comercial || null,
        whatsapp: data.whatsapp || null,
        endereco: data.endereco,
        slug,
        primary_color: data.primary_color || "#1B3A4B",
        business_hours: data.business_hours,
        plano: data.plano,
        ciclo: data.ciclo,
        selected_plan_slug: data.plano === "premium" ? "business" : data.plano,
        valor_mensal: data.valor_mensal,
        status_cobranca: data.status_cobranca,
        trial_ate: data.trial_ate || null,
        created_by: userId,
        onboarding_concluido: true,
        onboarding_step: 5,
    })
        .select("id, slug")
        .single();
    if (companyErr)
        throw new Error(companyErr.message);
    const { error: linkErr } = await client_server_1.supabaseAdmin.from("company_user").upsert({
        company_id: company.id,
        user_id: userId,
        email,
        nome: data.nome_admin || data.nome_fantasia || data.name,
        role: "owner",
        ativo: true,
        convite_aceito: true,
        forcar_troca_senha: false,
    }, { onConflict: "company_id,email" });
    if (linkErr)
        throw new Error(linkErr.message);
    return {
        companyId: company.id,
        slug: company.slug,
        email,
        tempPassword,
    };
});
const EmailsSchema = zod_1.z.object({
    emails: zod_1.z.array(zod_1.z.string().trim().email().max(255)).max(50),
});
exports.setSuperAdminEmails = (0, react_start_1.createServerFn)({ method: "POST" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .inputValidator((input) => EmailsSchema.parse(input))
    .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
    if (adminErr)
        throw new Error(adminErr.message);
    if (!isAdmin)
        throw new Error("Apenas super admin pode alterar a lista.");
    const normalized = Array.from(new Set(data.emails.map((e) => e.toLowerCase())));
    // Garante que app_config existe e atualiza
    const { data: existing } = await client_server_1.supabaseAdmin
        .from("app_config")
        .select("id")
        .limit(1)
        .maybeSingle();
    if (existing?.id) {
        const { error } = await client_server_1.supabaseAdmin
            .from("app_config")
            .update({ super_admin_emails: normalized })
            .eq("id", existing.id);
        if (error)
            throw new Error(error.message);
    }
    else {
        const { error } = await client_server_1.supabaseAdmin
            .from("app_config")
            .insert({ app_name: "BarbeiroPro AI", super_admin_emails: normalized });
        if (error)
            throw new Error(error.message);
    }
    // Para cada email já com conta, promove no user_roles (paginado)
    if (normalized.length > 0) {
        const allUsers = [];
        let page = 1;
        for (;;) {
            const { data: list, error } = await client_server_1.supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
            if (error)
                break;
            allUsers.push(...(list?.users ?? []));
            if (!list?.users || list.users.length < 200)
                break;
            page += 1;
            if (page > 25)
                break;
        }
        const promoted = [];
        for (const email of normalized) {
            const user = allUsers.find((u) => (u.email ?? "").toLowerCase() === email);
            if (!user)
                continue;
            await client_server_1.supabaseAdmin
                .from("user_roles")
                .upsert({ user_id: user.id, role: "super_admin" }, { onConflict: "user_id,role" });
            promoted.push(email);
        }
        return { ok: true, total: normalized.length, promoted };
    }
    return { ok: true, total: 0, promoted: [] };
});
const AppBrandSchema = zod_1.z.object({
    app_name: zod_1.z.string().trim().min(1).max(120),
    primary_color: zod_1.z.string().trim().max(20).optional().default(""),
});
exports.setAppBrand = (0, react_start_1.createServerFn)({ method: "POST" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .inputValidator((input) => AppBrandSchema.parse(input))
    .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
    if (adminErr)
        throw new Error(adminErr.message);
    if (!isAdmin)
        throw new Error("Apenas super admin pode alterar a marca.");
    const { data: existing } = await client_server_1.supabaseAdmin
        .from("app_config")
        .select("id, system_settings")
        .limit(1)
        .maybeSingle();
    const newSettings = {
        ...(existing?.system_settings ?? {}),
        primary_color: data.primary_color || existing?.system_settings?.primary_color || "",
    };
    if (existing?.id) {
        const { error } = await client_server_1.supabaseAdmin
            .from("app_config")
            .update({ app_name: data.app_name, system_settings: newSettings })
            .eq("id", existing.id);
        if (error)
            throw new Error(error.message);
    }
    else {
        const { error } = await client_server_1.supabaseAdmin
            .from("app_config")
            .insert({ app_name: data.app_name, super_admin_emails: [], system_settings: newSettings });
        if (error)
            throw new Error(error.message);
    }
    return { ok: true };
});

},
"src/lib/users.functions": (module:any,exports:any,require:any,process:any)=>{
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeTeamMember = exports.resetTeamMemberPassword = exports.setTeamMemberActive = exports.updateTeamMemberRole = exports.createTeamMember = exports.resetAdminPassword = exports.signUpInterno = void 0;
exports.generateTempPassword = generateTempPassword;
const react_start_1 = require("@tanstack/react-start");
const zod_1 = require("zod");
const auth_middleware_1 = require("@/integrations/supabase/auth-middleware");
const ROLES = ["owner", "admin", "barbeiro", "recepcao", "financeiro"];
function generateTempPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    let out = "";
    for (let i = 0; i < 12; i++)
        out += chars[bytes[i] % chars.length];
    return out;
}
async function findUserByEmail(admin, email) {
    let page = 1;
    for (;;) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error)
            throw new Error(error.message);
        const u = data?.users.find((x) => (x.email ?? "").toLowerCase() === email);
        if (u)
            return u.id;
        if (!data?.users || data.users.length < 200)
            return null;
        page += 1;
        if (page > 25)
            return null;
    }
}
// ===== Self-service signup (no email confirmation) =====
const SignUpSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email().max(255),
    password: zod_1.z.string().min(6).max(72),
    nome: zod_1.z.string().trim().max(200).optional().default(""),
});
// Limite simples em memória: 5 tentativas / 10 min por email (anti-spam)
const _signupAttempts = new Map();
function checkSignupRate(email) {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const list = (_signupAttempts.get(email) ?? []).filter((t) => now - t < windowMs);
    if (list.length >= 5)
        throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    list.push(now);
    _signupAttempts.set(email, list);
}
exports.signUpInterno = (0, react_start_1.createServerFn)({ method: "POST" })
    .inputValidator((input) => SignUpSchema.parse(input))
    .handler(async ({ data }) => {
    const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require("@/integrations/supabase/client.server")));
    const email = data.email.toLowerCase();
    checkSignupRate(email);
    const existing = await findUserByEmail(supabaseAdmin, email);
    if (existing)
        throw new Error("Já existe uma conta com este email. Entre com sua senha.");
    const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { nome: data.nome || "" },
    });
    if (error)
        throw new Error(error.message);
    return { ok: true };
});
// ===== Master: reset admin (owner) password =====
const ResetAdminSchema = zod_1.z.object({ company_id: zod_1.z.string().uuid() });
exports.resetAdminPassword = (0, react_start_1.createServerFn)({ method: "POST" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .inputValidator((input) => ResetAdminSchema.parse(input))
    .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
    if (adminErr)
        throw new Error(adminErr.message);
    if (!isAdmin)
        throw new Error("Apenas super admin pode resetar senhas.");
    const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require("@/integrations/supabase/client.server")));
    const { data: owner, error: ownerErr } = await supabaseAdmin
        .from("company_user")
        .select("id, user_id, email")
        .eq("company_id", data.company_id)
        .eq("role", "owner")
        .eq("ativo", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
    if (ownerErr)
        throw new Error(ownerErr.message);
    if (!owner?.user_id)
        throw new Error("Owner não encontrado para esta barbearia.");
    const tempPassword = generateTempPassword();
    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(owner.user_id, {
        password: tempPassword,
    });
    if (upErr)
        throw new Error(upErr.message);
    await supabaseAdmin
        .from("company_user")
        .update({ forcar_troca_senha: true })
        .eq("id", owner.id);
    return { email: owner.email, tempPassword };
});
// ===== Team management (owner/admin of company OR super admin) =====
async function assertCanManageTeam(context, companyId) {
    const { data: isAdmin } = await context.supabase.rpc("is_super_admin");
    if (isAdmin)
        return;
    const { data: ok, error } = await context.supabase.rpc("has_company_role", {
        _company_id: companyId,
        _roles: ["owner", "admin"],
    });
    if (error)
        throw new Error(error.message);
    if (!ok)
        throw new Error("Sem permissão para gerenciar a equipe.");
}
const CreateMemberSchema = zod_1.z.object({
    company_id: zod_1.z.string().uuid(),
    email: zod_1.z.string().trim().email().max(255),
    nome: zod_1.z.string().trim().max(200).optional().default(""),
    role: zod_1.z.enum(ROLES),
    password: zod_1.z.string().min(6).max(72).optional(),
    generate_password: zod_1.z.boolean().optional().default(false),
});
exports.createTeamMember = (0, react_start_1.createServerFn)({ method: "POST" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .inputValidator((input) => CreateMemberSchema.parse(input))
    .handler(async ({ data, context }) => {
    await assertCanManageTeam(context, data.company_id);
    const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require("@/integrations/supabase/client.server")));
    const email = data.email.toLowerCase();
    const { data: profile } = await supabaseAdmin.from("profiles").select("user_id").eq("email", email).maybeSingle();
    const { error } = await supabaseAdmin.from("company_user").upsert({
        company_id: data.company_id, email, nome: data.nome, role: data.role,
        user_id: profile?.user_id || null, ativo: true, convite_aceito: !!profile, forcar_troca_senha: false,
    }, { onConflict: "company_id,email" });
    if (error)
        throw new Error(error.message);
    return { email, password: "Entre com sua conta Blink usando este e-mail", generated: false };
});
const UpdateRoleSchema = zod_1.z.object({
    company_id: zod_1.z.string().uuid(),
    member_id: zod_1.z.string().uuid(),
    role: zod_1.z.enum(ROLES),
});
exports.updateTeamMemberRole = (0, react_start_1.createServerFn)({ method: "POST" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .inputValidator((input) => UpdateRoleSchema.parse(input))
    .handler(async ({ data, context }) => {
    await assertCanManageTeam(context, data.company_id);
    const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require("@/integrations/supabase/client.server")));
    const { error } = await supabaseAdmin
        .from("company_user")
        .update({ role: data.role })
        .eq("id", data.member_id)
        .eq("company_id", data.company_id);
    if (error)
        throw new Error(error.message);
    return { ok: true };
});
const SetActiveSchema = zod_1.z.object({
    company_id: zod_1.z.string().uuid(),
    member_id: zod_1.z.string().uuid(),
    ativo: zod_1.z.boolean(),
});
exports.setTeamMemberActive = (0, react_start_1.createServerFn)({ method: "POST" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .inputValidator((input) => SetActiveSchema.parse(input))
    .handler(async ({ data, context }) => {
    await assertCanManageTeam(context, data.company_id);
    const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require("@/integrations/supabase/client.server")));
    const { error } = await supabaseAdmin
        .from("company_user")
        .update({ ativo: data.ativo })
        .eq("id", data.member_id)
        .eq("company_id", data.company_id);
    if (error)
        throw new Error(error.message);
    return { ok: true };
});
const ResetMemberSchema = zod_1.z.object({
    company_id: zod_1.z.string().uuid(),
    member_id: zod_1.z.string().uuid(),
    password: zod_1.z.string().min(6).max(72).optional(),
});
exports.resetTeamMemberPassword = (0, react_start_1.createServerFn)({ method: "POST" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .inputValidator((input) => ResetMemberSchema.parse(input))
    .handler(async ({ data, context }) => {
    await assertCanManageTeam(context, data.company_id);
    const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require("@/integrations/supabase/client.server")));
    const { data: member, error } = await supabaseAdmin
        .from("company_user")
        .select("id, user_id, email")
        .eq("id", data.member_id)
        .eq("company_id", data.company_id)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!member?.user_id)
        throw new Error("Membro sem conta vinculada.");
    const password = data.password && data.password.length >= 6 ? data.password : generateTempPassword();
    const wasGenerated = !data.password || data.password.length < 6;
    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(member.user_id, {
        password,
    });
    if (upErr)
        throw new Error(upErr.message);
    await supabaseAdmin
        .from("company_user")
        .update({ forcar_troca_senha: wasGenerated })
        .eq("id", member.id);
    return { email: member.email, password, generated: wasGenerated };
});
const RemoveMemberSchema = zod_1.z.object({
    company_id: zod_1.z.string().uuid(),
    member_id: zod_1.z.string().uuid(),
});
exports.removeTeamMember = (0, react_start_1.createServerFn)({ method: "POST" })
    .middleware([auth_middleware_1.requireSupabaseAuth])
    .inputValidator((input) => RemoveMemberSchema.parse(input))
    .handler(async ({ data, context }) => {
    await assertCanManageTeam(context, data.company_id);
    const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require("@/integrations/supabase/client.server")));
    const { error } = await supabaseAdmin
        .from("company_user")
        .delete()
        .eq("id", data.member_id)
        .eq("company_id", data.company_id);
    if (error)
        throw new Error(error.message);
    return { ok: true };
});

},
"src/routes/api/public/billing/webhook": (module:any,exports:any,require:any,process:any)=>{
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
const react_router_1 = require("@tanstack/react-router");
const normalize_1 = require("src/lib/billing/normalize");
const ALLOWED = ["kiwify", "cakto", "perfectpay", "hotmart", "kirvano"];
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-webhook-token",
};
function json(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
    });
}
async function readBody(request) {
    const ct = (request.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
        try {
            return await request.json();
        }
        catch {
            return {};
        }
    }
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
        try {
            const form = await request.formData();
            const obj = {};
            for (const [k, v] of form.entries()) {
                // try parse json values for keys like "data"
                if (typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
                    try {
                        obj[k] = JSON.parse(v);
                        continue;
                    }
                    catch { }
                }
                obj[k] = v;
            }
            return obj;
        }
        catch {
            return {};
        }
    }
    // fallback: try json then text
    try {
        const text = await request.text();
        if (!text)
            return {};
        try {
            return JSON.parse(text);
        }
        catch {
            return { _raw: text };
        }
    }
    catch {
        return {};
    }
}
exports.Route = (0, react_router_1.createFileRoute)("/api/public/billing/webhook")({
    server: {
        handlers: {
            OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
            POST: async ({ request }) => {
                const url = new URL(request.url);
                const provider = (url.searchParams.get("provider") || "").toLowerCase();
                const tokenQ = url.searchParams.get("token") || "";
                const tokenH = request.headers.get("x-webhook-token") || "";
                const token = tokenQ || tokenH;
                if (!ALLOWED.includes(provider)) {
                    return json(400, { ok: false, error: "provider inválido" });
                }
                const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require("@/integrations/supabase/client.server")));
                const { applyEvent, getWebhookTokenForProvider } = await Promise.resolve().then(() => __importStar(require("src/lib/billing/apply.server")));
                const expected = await getWebhookTokenForProvider(provider);
                if (!expected || !token || token !== expected) {
                    // Log e responde 200 mas com ok:false
                    await supabaseAdmin.from("billing_event_log").insert({
                        provider,
                        event_type: "auth_failed",
                        processed: false,
                        error: "token inválido",
                        payload: {},
                    });
                    return json(401, { ok: false, error: "token inválido" });
                }
                const body = await readBody(request);
                try {
                    const evt = (0, normalize_1.normalize)(provider, body);
                    const result = await applyEvent(evt, body);
                    if (!result.ok && result.retry) {
                        // Erro de gravação no banco => 500 para o provedor reenviar
                        return json(500, { ok: false, eventType: evt.eventType, error: result.error });
                    }
                    return json(200, { ok: result.ok, eventType: evt.eventType, error: result.error });
                }
                catch (err) {
                    // Erro de parsing/normalização => 200 (não tem como reprocessar)
                    await supabaseAdmin.from("billing_event_log").insert({
                        provider,
                        event_type: "exception",
                        processed: false,
                        error: err?.message ?? String(err),
                        payload: body ?? {},
                    });
                    return json(200, { ok: false, error: err?.message ?? "erro interno" });
                }
            },
        },
    },
});

},
"src/lib/billing/normalize": (module:any,exports:any,require:any,process:any)=>{
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = normalize;
function pick(...vals) {
    for (const v of vals) {
        if (v !== undefined && v !== null && v !== "")
            return v;
    }
    return null;
}
function lower(v) {
    if (typeof v !== "string")
        return null;
    const t = v.trim().toLowerCase();
    return t || null;
}
function digits(v) {
    if (v == null)
        return null;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    if (isNaN(n))
        return null;
    return Math.round(n);
}
function detectKiwify(name) {
    const n = name.toLowerCase();
    if (/refund/.test(n))
        return "refunded";
    if (/chargeback/.test(n))
        return "chargeback";
    if (/(subscription[_-]?renewed|renewed)/.test(n))
        return "subscription_renewed";
    if (/(subscription[_-]?canceled|canceled|cancelled)/.test(n))
        return "subscription_canceled";
    if (/(order[_-]?approved|paid|approved)/.test(n))
        return "purchase_approved";
    if (/(billet[_-]?overdue|rejected|pix[_-]?expired|expired|overdue|failed)/.test(n))
        return "payment_failed";
    return "unknown";
}
function detectCakto(name) {
    const n = name.toLowerCase();
    if (/refund/.test(n))
        return "refunded";
    if (/chargeback/.test(n))
        return "chargeback";
    if (/renewed/.test(n))
        return "subscription_renewed";
    if (/canceled|cancelled/.test(n))
        return "subscription_canceled";
    if (/paid|approved|purchase[_-]?approved/.test(n))
        return "purchase_approved";
    if (/payment[_-]?failed|overdue|failed/.test(n))
        return "payment_failed";
    return "unknown";
}
function detectPerfectPay(name, code) {
    const n = name.toLowerCase();
    const c = code != null ? String(code) : "";
    if (n.includes("refund") || c === "7")
        return "refunded";
    if (n.includes("chargeback"))
        return "chargeback";
    if (n.includes("canceled") || n.includes("cancelled"))
        return "subscription_canceled";
    if (n.includes("approved") || c === "2")
        return "purchase_approved";
    if (/fail|expired/.test(n))
        return "payment_failed";
    return "unknown";
}
function detectHotmart(name) {
    const n = name.toUpperCase();
    if (n === "PURCHASE_REFUNDED")
        return "refunded";
    if (n === "PURCHASE_CHARGEBACK")
        return "chargeback";
    if (n === "SUBSCRIPTION_CANCELLATION")
        return "subscription_canceled";
    if (n === "PURCHASE_APPROVED" || n === "PURCHASE_COMPLETE")
        return "purchase_approved";
    if (n === "PURCHASE_DELAYED" || n === "PURCHASE_BILLET_PRINTED")
        return "payment_failed";
    if (n.includes("SUBSCRIPTION") || n.includes("RENEW"))
        return "subscription_renewed";
    return "unknown";
}
function detectKirvano(name) {
    const n = name.toUpperCase();
    if (n === "SALE_REFUNDED")
        return "refunded";
    if (n === "CHARGEBACK")
        return "chargeback";
    if (n === "SUBSCRIPTION_CANCELED")
        return "subscription_canceled";
    if (n === "SUBSCRIPTION_RENEWED")
        return "subscription_renewed";
    if (n === "SALE_APPROVED" || n === "sale_approved".toUpperCase())
        return "purchase_approved";
    if (/EXPIRED|ABANDONED|PAYMENT_FAILED/.test(n))
        return "payment_failed";
    return "unknown";
}
function normalize(provider, body) {
    const b = body ?? {};
    const data = b.data ?? {};
    let rawEventName = "";
    let eventType = "unknown";
    let buyerEmail = null;
    let externalSubscriptionId = null;
    let externalCustomerId = null;
    let productRef = null;
    let amountCents = null;
    let periodEnd = null;
    switch (provider) {
        case "kiwify": {
            rawEventName = String(pick(b.webhook_event_type, b.event, b.order_status, data.event, "") ?? "");
            eventType = detectKiwify(rawEventName);
            buyerEmail = lower(pick(b.Customer?.email, b.customer?.email, b.buyer?.email, data.customer?.email));
            externalSubscriptionId = pick(b.Subscription?.id, b.subscription_id, b.subscription?.id);
            externalCustomerId = pick(b.Customer?.id, b.customer?.id, b.customer_id);
            productRef = String(pick(b.Product?.product_id, b.product_id, b.offer_id, b.Product?.id) ?? "") || null;
            amountCents = digits(pick(b.Commissions?.charge_amount, b.charge_amount, b.amount));
            periodEnd = pick(b.Subscription?.next_payment, b.subscription?.next_payment);
            break;
        }
        case "cakto": {
            rawEventName = String(pick(b.event, b.status, data.status, "") ?? "");
            eventType = detectCakto(rawEventName);
            buyerEmail = lower(pick(data.customer?.email, b.customer?.email, b.email));
            externalSubscriptionId = pick(data.subscription?.id, b.subscription_id);
            externalCustomerId = pick(data.customer?.id, b.customer?.id);
            productRef = String(pick(data.product?.id, b.product?.id, b.offer_id, data.offer_id) ?? "") || null;
            amountCents = digits(pick(data.amount, b.amount, data.price));
            periodEnd = pick(data.subscription?.next_billing, data.next_billing);
            break;
        }
        case "perfectpay": {
            const code = pick(b.sale_status_enum, b.status_code, b.status);
            rawEventName = String(pick(b.sale_status_detail, b.status, b.event, "") ?? "");
            eventType = detectPerfectPay(rawEventName, code);
            buyerEmail = lower(pick(b.customer?.email, b.email, b.payer_email));
            externalSubscriptionId = pick(b.subscription?.code, b.subscription_code, b.code);
            externalCustomerId = pick(b.customer?.id, b.customer_code);
            productRef = String(pick(b.product?.code, b.plan?.code, b.product_code) ?? "") || null;
            amountCents = digits(pick(b.sale_amount, b.amount));
            periodEnd = pick(b.subscription?.next_charge_date, b.next_payment);
            break;
        }
        case "hotmart": {
            rawEventName = String(pick(b.event, b.type, "") ?? "");
            eventType = detectHotmart(rawEventName);
            buyerEmail = lower(pick(data.buyer?.email, b.buyer?.email, data.subscriber?.email));
            externalSubscriptionId = pick(data.subscription?.subscriber?.code, data.subscription?.code);
            externalCustomerId = pick(data.buyer?.ucode, data.buyer?.id);
            productRef = String(pick(data.product?.id, data.product?.ucode, b.product?.id) ?? "") || null;
            amountCents = digits(pick(data.purchase?.price?.value, data.commission?.value));
            periodEnd = pick(data.subscription?.date_next_charge, data.subscription?.end_accession_date);
            break;
        }
        case "kirvano": {
            rawEventName = String(pick(b.event, b.type, "") ?? "");
            eventType = detectKirvano(rawEventName);
            buyerEmail = lower(pick(b.customer?.email, b.email, data.customer?.email));
            externalSubscriptionId = pick(b.subscription?.id, b.subscription_id);
            externalCustomerId = pick(b.customer?.id, b.customer_id);
            productRef = String(pick(b.product_id, b.offer_id, b.plan_id, b.product?.id, b.plan?.id) ?? "") || null;
            amountCents = digits(pick(b.amount, b.total_price, b.value));
            periodEnd = pick(b.subscription?.next_charge_date, b.next_billing_at);
            break;
        }
    }
    return {
        provider,
        eventType,
        rawEventName,
        buyerEmail,
        externalSubscriptionId: externalSubscriptionId ? String(externalSubscriptionId) : null,
        externalCustomerId: externalCustomerId ? String(externalCustomerId) : null,
        productRef,
        amountCents,
        periodEnd: periodEnd ? String(periodEnd) : null,
    };
}

},
"src/lib/billing/apply.server": (module:any,exports:any,require:any,process:any)=>{
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyEvent = applyEvent;
exports.getWebhookTokenForProvider = getWebhookTokenForProvider;
const client_server_1 = require("@/integrations/supabase/client.server");
function mapStatus(evt) {
    switch (evt) {
        case "purchase_approved":
        case "subscription_renewed":
            return { sub: "active", company: "ativo" };
        case "subscription_canceled":
            return { sub: "canceled", company: "cancelado" };
        case "refunded":
        case "chargeback":
            return { sub: "canceled", company: "suspenso" };
        case "payment_failed":
            return { sub: "past_due", company: "inadimplente" };
        default:
            return null;
    }
}
async function findCompanyByEmail(email) {
    // 1) auth.users -> company_user (paginado)
    try {
        let page = 1;
        let userId = null;
        for (;;) {
            const { data: list, error } = await client_server_1.supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
            if (error)
                break;
            const u = list?.users.find((x) => (x.email ?? "").toLowerCase() === email);
            if (u) {
                userId = u.id;
                break;
            }
            if (!list?.users || list.users.length < 200)
                break;
            page += 1;
            if (page > 25)
                break;
        }
        if (userId) {
            const { data: cu } = await client_server_1.supabaseAdmin
                .from("company_user")
                .select("company_id")
                .eq("user_id", userId)
                .eq("ativo", true)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
            if (cu?.company_id)
                return cu.company_id;
        }
    }
    catch { }
    // 2) company.email_contato
    const { data: byContact } = await client_server_1.supabaseAdmin
        .from("company")
        .select("id")
        .ilike("email_contato", email)
        .limit(1)
        .maybeSingle();
    if (byContact?.id)
        return byContact.id;
    return null;
}
async function findPlanByRef(ref) {
    if (!ref)
        return null;
    const { data: bySlug } = await client_server_1.supabaseAdmin
        .from("plan")
        .select("id, slug")
        .eq("slug", ref)
        .maybeSingle();
    if (bySlug)
        return bySlug;
    const { data: byUrl } = await client_server_1.supabaseAdmin
        .from("plan")
        .select("id, slug, checkout_url")
        .ilike("checkout_url", `%${ref}%`)
        .limit(1)
        .maybeSingle();
    if (byUrl)
        return byUrl;
    const { data: byPriceIds } = await client_server_1.supabaseAdmin
        .from("plan")
        .select("id, slug, provider_price_ids")
        .filter("provider_price_ids", "cs", JSON.stringify({ ref }))
        .limit(1)
        .maybeSingle();
    if (byPriceIds)
        return byPriceIds;
    return null;
}
async function applyEvent(evt, rawPayload) {
    const baseLog = {
        provider: evt.provider,
        event_type: evt.eventType,
        external_id: evt.externalSubscriptionId,
        buyer_email: evt.buyerEmail,
        payload: rawPayload ?? {},
    };
    if (!evt.buyerEmail) {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
            ...baseLog,
            processed: false,
            error: "buyer_email ausente no payload",
        });
        // ignorado, não reprocessável
        return { ok: true, error: "buyer_email ausente" };
    }
    const companyId = await findCompanyByEmail(evt.buyerEmail);
    if (!companyId) {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
            ...baseLog,
            processed: false,
            error: "empresa não encontrada para email " + evt.buyerEmail,
        });
        // não há o que aplicar; não pede retry
        return { ok: true, error: "empresa não encontrada" };
    }
    if (evt.eventType === "unknown") {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
            ...baseLog,
            matched_company_id: companyId,
            processed: true,
            error: "evento desconhecido: " + evt.rawEventName,
        });
        return { ok: true, companyId };
    }
    const status = mapStatus(evt.eventType);
    if (!status) {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
            ...baseLog,
            matched_company_id: companyId,
            processed: true,
        });
        return { ok: true, companyId };
    }
    const plan = await findPlanByRef(evt.productRef);
    const subPayload = {
        company_id: companyId,
        status: status.sub,
        provider: evt.provider,
        external_subscription_id: evt.externalSubscriptionId,
        external_customer_id: evt.externalCustomerId,
        buyer_email: evt.buyerEmail,
        metadata: { rawEventName: evt.rawEventName },
    };
    if (plan?.id)
        subPayload.plan_id = plan.id;
    if (evt.periodEnd) {
        const d = new Date(evt.periodEnd);
        if (!isNaN(d.getTime()))
            subPayload.current_period_end = d.toISOString();
    }
    if (status.sub === "canceled")
        subPayload.canceled_at = new Date().toISOString();
    const { error: subErr } = await client_server_1.supabaseAdmin
        .from("subscription")
        .upsert(subPayload, { onConflict: "company_id" });
    if (subErr) {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
            ...baseLog,
            matched_company_id: companyId,
            processed: false,
            error: "subscription upsert: " + subErr.message,
        });
        return { ok: false, retry: true, error: subErr.message };
    }
    const companyUpdate = { status_cobranca: status.company };
    if (plan?.slug)
        companyUpdate.selected_plan_slug = plan.slug;
    const { error: cErr } = await client_server_1.supabaseAdmin
        .from("company")
        .update(companyUpdate)
        .eq("id", companyId);
    if (cErr) {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
            ...baseLog,
            matched_company_id: companyId,
            processed: false,
            error: "company update: " + cErr.message,
        });
        return { ok: false, retry: true, error: cErr.message };
    }
    await client_server_1.supabaseAdmin.from("billing_event_log").insert({
        ...baseLog,
        matched_company_id: companyId,
        processed: true,
    });
    return { ok: true, companyId };
}
async function getWebhookTokenForProvider(provider) {
    const { data } = await client_server_1.supabaseAdmin
        .from("app_config")
        .select("system_settings")
        .limit(1)
        .maybeSingle();
    const tokens = data?.system_settings?.webhook_tokens ?? {};
    return tokens[provider] ?? null;
}

}}
export function loadDomain(ctx:any){
 const cache:Record<string,any>={}
 const external:Record<string,any>={"zod":external0}
 function createServerFn(){let validate=(x:any)=>x,needsAuth=false;const builder:any={middleware(){needsAuth=true;return builder},inputValidator(fn:any){validate=fn;return builder},handler(fn:any){return async(args:any={})=>{if(needsAuth&&!ctx.identity.userId)throw new Error('Autenticação necessária');return fn({context:{supabase:ctx.scoped,userId:ctx.identity.userId,claims:ctx.identity},data:validate(args.data),request:ctx.request})}}};return builder}
 const special:Record<string,any>={'@tanstack/react-router':{createFileRoute:()=> (config:any)=>config},'@tanstack/react-start':{createServerFn},'@tanstack/react-start/server':{getRequest:()=>ctx.request},'@/integrations/supabase/auth-middleware':{requireSupabaseAuth:{}},'@/integrations/supabase/client.server':{supabaseAdmin:ctx.admin},'@/integrations/supabase/client':{supabase:ctx.scoped},'@/blink/client':{blink:ctx.blink},'node:process':{env:ctx.env}}
 function load(id:string):any{if(special[id])return special[id];if(external[id])return external[id];if(cache[id])return cache[id].exports;if(!factories[id])throw new Error('Módulo indisponível');const module={exports:{}};cache[id]=module;factories[id](module,module.exports,load,{env:ctx.env});return module.exports}
 return load
}
