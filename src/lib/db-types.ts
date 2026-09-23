// Auto-generated from your database schema — do not edit by hand.
// Regenerates automatically whenever a table is created or altered.

export type AppConfigRow = {
  appName: string | null
  createdAt: string | null
  id: string
  superAdminEmails: string | null
  systemSettings: string | null
  updatedAt: string | null
}

export type AppointmentRow = {
  companyId: string | null
  completedAt: string | null
  confirmToken: string | null
  confirmedAt: string | null
  createdAt: string | null
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  id: string
  notes: string | null
  price: number | string | null
  professionalId: string | null
  professionalName: string | null
  scheduledAt: string | null
  serviceId: string | null
  serviceName: string | null
  source: string | null
  status: string | null
  updatedAt: string | null
}

export type BillingEventLogRow = {
  buyerEmail: string | null
  createdAt: string | null
  error: string | null
  eventType: string | null
  externalId: string | null
  id: string
  matchedCompanyId: string | null
  payload: string | null
  processed: boolean | null
  provider: string | null
}

export type ClubMemberRow = {
  clubPlanId: string | null
  companyId: string | null
  createdAt: string | null
  currentPeriodEnd: string | null
  customerId: string | null
  id: string
  startedAt: string | null
  status: string | null
  updatedAt: string | null
}

export type ClubPlanRow = {
  ativo: boolean | null
  beneficios: string | null
  checkoutUrl: string | null
  companyId: string | null
  createdAt: string | null
  id: string
  nome: string | null
  precoCents: number | string | null
  updatedAt: string | null
}

export type CompanyRow = {
  businessHours: string | null
  ciclo: string | null
  cnpj: string | null
  cpfResponsavel: string | null
  createdAt: string | null
  createdBy: string | null
  emailContato: string | null
  endereco: string | null
  fidelidadeAtiva: boolean | null
  fidelidadeMeta: number | string | null
  fidelidadePremio: string | null
  id: string
  logoUrl: string | null
  name: string | null
  nomeFantasia: string | null
  onboardingConcluido: boolean | null
  onboardingStep: number | string | null
  plano: string | null
  primaryColor: string | null
  proximoVencimento: string | null
  razaoSocial: string | null
  selectedPlanSlug: string | null
  slug: string | null
  statusCobranca: string | null
  telefoneComercial: string | null
  trialAte: string | null
  ultimoAcessoAt: string | null
  updatedAt: string | null
  valorMensal: number | string | null
  whatsapp: string | null
}

export type CompanyUserRow = {
  ativo: boolean | null
  companyId: string | null
  conviteAceito: boolean | null
  conviteToken: string | null
  createdAt: string | null
  email: string | null
  forcarTrocaSenha: boolean | null
  id: string
  nome: string | null
  role: string | null
  ultimoLogin: string | null
  updatedAt: string | null
  userId: string | null
}

export type CustomerRow = {
  companyId: string | null
  createdAt: string | null
  email: string | null
  fidelidadeContador: number | string | null
  id: string
  lastAppointmentAt: string | null
  name: string | null
  notes: string | null
  phone: string | null
  status: string | null
  tags: string | null
  totalAppointments: number | string | null
  updatedAt: string | null
}

export type FinancialEntryRow = {
  amount: number | string | null
  category: string | null
  companyId: string | null
  createdAt: string | null
  date: string | null
  description: string | null
  id: string
  referenceAppointmentId: string | null
  status: string | null
  type: string | null
  updatedAt: string | null
}

export type InvoiceSimulatedRow = {
  amount: number | string | null
  companyId: string | null
  createdAt: string | null
  dueDate: string | null
  id: string
  paidAt: string | null
  referenceMonth: string | null
  status: string | null
}

export type PlanRow = {
  ativo: boolean | null
  checkoutUrl: string | null
  createdAt: string | null
  descricao: string | null
  destaque: boolean | null
  features: string | null
  id: string
  intervalo: string | null
  limiteAgendamentosMes: number | string | null
  limiteClientes: number | string | null
  limiteProfissionais: number | string | null
  limiteUsuarios: number | string | null
  moeda: string | null
  nome: string | null
  ordem: number | string | null
  precoCents: number | string | null
  providerPriceIds: string | null
  slug: string | null
  trialDays: number | string | null
  updatedAt: string | null
}

export type ProductRow = {
  ativo: boolean | null
  companyId: string | null
  createdAt: string | null
  custoCents: number | string | null
  estoque: number | string | null
  id: string
  nome: string | null
  precoCents: number | string | null
  updatedAt: string | null
}

export type ProfessionalRow = {
  active: boolean | null
  comissaoPercentual: number | string | null
  commissionType: string | null
  commissionValue: number | string | null
  companyId: string | null
  createdAt: string | null
  id: string
  name: string | null
  photoUrl: string | null
  specialty: string | null
  updatedAt: string | null
  workSchedule: string | null
}

export type ProfessionalServiceRow = {
  comissaoPercentual: number | string | null
  commissionType: string | null
  commissionValue: number | string | null
  professionalId: string | null
  serviceId: string | null
}

export type ProfilesRow = {
  userId: string
  email: string | null
  nome: string | null
}

export type SaleRow = {
  appointmentId: string | null
  closedAt: string | null
  companyId: string | null
  createdAt: string | null
  createdBy: string | null
  customerId: string | null
  descontoCents: number | string | null
  formaPagamento: string | null
  id: string
  observacao: string | null
  professionalId: string | null
  status: string | null
  totalCents: number | string | null
  updatedAt: string | null
}

export type SaleItemRow = {
  comissaoCents: number | string | null
  comissaoPercentual: number | string | null
  companyId: string | null
  createdAt: string | null
  descricao: string | null
  id: string
  precoCents: number | string | null
  professionalId: string | null
  quantidade: number | string | null
  refId: string | null
  saleId: string | null
  tipo: string | null
}

export type ServiceRow = {
  active: boolean | null
  categoryId: string | null
  companyId: string | null
  createdAt: string | null
  description: string | null
  durationMinutes: number | string | null
  featured: boolean | null
  id: string
  name: string | null
  price: number | string | null
  updatedAt: string | null
}

export type ServiceCategoryRow = {
  active: boolean | null
  companyId: string | null
  createdAt: string | null
  id: string
  name: string | null
  sortOrder: number | string | null
  updatedAt: string | null
}

export type SubscriptionRow = {
  buyerEmail: string | null
  cancelAtPeriodEnd: boolean | null
  canceledAt: string | null
  companyId: string | null
  createdAt: string | null
  currentPeriodEnd: string | null
  currentPeriodStart: string | null
  externalCustomerId: string | null
  externalSubscriptionId: string | null
  id: string
  metadata: string | null
  planId: string | null
  provider: string | null
  status: string | null
  trialEndsAt: string | null
  updatedAt: string | null
}

export type TemplateOwnerRow = {
  id: string
  userId: string
}

export type TrialIdentityRow = {
  companyId: string | null
  cpf: string | null
  createdAt: string | null
  email: string | null
  id: string
  phone: string | null
  userId: string | null
}

export type UserRolesRow = {
  createdAt: string | null
  id: string
  role: string | null
  userId: string | null
}
