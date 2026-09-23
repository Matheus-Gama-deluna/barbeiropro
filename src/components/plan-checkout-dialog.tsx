import { useNavigate } from '@tanstack/react-router'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
type Plan={slug:string;name:string;price:number;trial_days?:number}
export function PlanCheckoutDialog({open,onOpenChange,plan}:{open:boolean;onOpenChange:(v:boolean)=>void;plan:Plan|null}){
 const navigate=useNavigate();
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Plano {plan?.name||'da sua barbearia'}</DialogTitle><DialogDescription>Entre ou crie sua conta para cadastrar a barbearia e começar o período de teste.</DialogDescription></DialogHeader><p className="text-sm">{plan?.trial_days??14} dias grátis. Depois, R$ {plan?.price??0}/mês pelo sistema de gestão.</p><Button onClick={()=>{if(plan)sessionStorage.setItem('barbeiropro-plan',plan.slug);onOpenChange(false);navigate({to:'/entrar'})}}>Continuar para entrar</Button></DialogContent></Dialog>
}
