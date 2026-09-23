import { callBackend } from '@/blink/backend'
export const getBillingWebhookInfo = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/billing.functions", name:"getBillingWebhookInfo",data:args.data})
export const regenerateWebhookToken = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/billing.functions", name:"regenerateWebhookToken",data:args.data})
export const listBillingEvents = (args:any={}) => callBackend('/api/rpc', {module:"src/lib/billing.functions", name:"listBillingEvents",data:args.data})
