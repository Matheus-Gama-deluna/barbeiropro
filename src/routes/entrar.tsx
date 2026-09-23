import {createFileRoute,Link,useNavigate} from '@tanstack/react-router'
import {useEffect,useState} from 'react'
import {blink} from '@/blink/client'
import {supabase} from '@/integrations/supabase/client'
import {Button} from '@/components/ui/button'
import {Card,CardHeader,CardTitle,CardDescription,CardContent} from '@/components/ui/card'
import {Scissors} from 'lucide-react'
export const Route=createFileRoute('/entrar')({component:Entrar})
function Entrar(){const navigate=useNavigate();const [error,setError]=useState('');const [checking,setChecking]=useState(true);
 useEffect(()=>{supabase.auth.getSession().then(async({data})=>{if(data.session){const {data:master,error}=await supabase.rpc('is_super_admin',{});if(error)throw new Error(error.message);navigate({to:master?'/master/painel':'/app/dashboard'})}}).catch(e=>setError(e.message)).finally(()=>setChecking(false))},[navigate]);
 return <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface)] px-4 py-10"><Link to="/" className="flex items-center gap-2 mb-6"><Scissors/><b>BarbeiroPro AI</b></Link><Card className="w-full max-w-md"><CardHeader><CardTitle>Acessar sua conta</CardTitle><CardDescription>Entre ou crie sua conta para gerenciar sua barbearia.</CardDescription></CardHeader><CardContent className="space-y-4">{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}<Button disabled={checking} className="w-full" onClick={()=>{const id=import.meta.env.VITE_BLINK_PROJECT_ID;if(/\.(blinkusercontent\.com|blinkpowered\.com)$/.test(window.location.hostname)&&window.location.hostname.split('.')[0]!==id){setError('Finalize a instalação desta cópia pelo comando do guia antes de entrar.');return;}blink.auth.login(window.location.origin+'/entrar')}}>{checking?'Verificando acesso…':'Entrar com minha conta Blink'}</Button><p className="text-sm text-muted-foreground">Se você clonou o sistema, use o mesmo e-mail informado na instalação.</p><Link to="/demo/dashboard" className="block text-center underline text-sm">Conhecer a demonstração</Link></CardContent></Card></div>
}
