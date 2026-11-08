import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogIn } from "lucide-react";
import { configurado, supabase, urlBruta } from "../../data/supabase";
import { Botao, Campo, Carregando, Entrada, Marca } from "../../ui/kit";

/** Na versão Vercel, exige login (e-mail e senha do Supabase) antes de abrir o app. */
export function PortaoLogin({ children }: { children: (s: Session) => ReactNode }) {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    if (!configurado()) return setSessao(null);
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSessao((atual) => (atual?.user.id === s?.user.id ? atual ?? s : s)));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!configurado())
    return (
      <Moldura>
        <h1 className="text-[22px] font-semibold">Falta configurar o banco</h1>
        <p className="mt-2 max-w-md text-[14.5px] text-muted">
          {urlBruta ? "O valor de VITE_SUPABASE_URL na Vercel não é um endereço válido. Ele deve ser parecido com https://abcdefgh.supabase.co (Supabase → Project Settings → API → Project URL)." : "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente da Vercel."} Depois faça um novo deploy.
        </p>
        {urlBruta && <p className="mt-2 font-mono text-[12px] text-dim">Valor atual começa com: {urlBruta.slice(0, 12)}…</p>}
      </Moldura>
    );
  if (sessao === undefined) return <Moldura><Carregando texto="Abrindo" /></Moldura>;
  if (!sessao) return <FormLogin />;
  return <>{children(sessao)}</>;
}

function FormLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [nota, setNota] = useState("");
  const [indo, setIndo] = useState(false);
  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setIndo(true);
    setErro("");
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: senha });
    setIndo(false);
    if (error) setErro(/invalid/i.test(error.message) ? "E-mail ou senha incorretos." : "Não foi possível entrar. Verifique a conexão e tente de novo.");
  }
  async function esqueci() {
    if (!email.trim()) return setErro("Digite seu e-mail primeiro.");
    const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin });
    setErro(error ? "Não foi possível enviar o e-mail agora." : "");
    if (!error) setNota("Enviamos um link para criar uma nova senha.");
  }
  return (
    <Moldura>
      <form onSubmit={entrar} className="w-full max-w-sm space-y-4 text-left">
        <h1 className="text-center text-[22px] font-semibold">Entrar</h1>
        <Campo rotulo="E-mail" htmlFor="lg-e"><Entrada id="lg-e" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
        <Campo rotulo="Senha" htmlFor="lg-s"><Entrada id="lg-s" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
        {erro && <p className="text-[13.5px] text-bad">{erro}</p>}
        {nota && <p className="text-[13.5px] text-ok">{nota}</p>}
        <Botao type="submit" variante="primario" className="w-full" icone={<LogIn className="size-4" />} carregando={indo} disabled={!email || !senha}>Entrar</Botao>
        <button type="button" onClick={esqueci} className="block w-full text-center text-[13px] text-muted hover:text-fg">Esqueci a senha</button>
      </form>
    </Moldura>
  );
}

/** Tela para definir nova senha quando o link de recuperação é aberto. */
export function NovaSenha() {
  const [ativo, setAtivo] = useState(false);
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!configurado()) return;
    const { data } = supabase().auth.onAuthStateChange((e) => e === "PASSWORD_RECOVERY" && setAtivo(true));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ativo) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="card w-full max-w-sm space-y-4 p-5">
        <h2 className="text-[17px] font-semibold">Nova senha</h2>
        <Entrada type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 8 caracteres" />
        {msg && <p className="text-[13.5px] text-muted">{msg}</p>}
        <Botao variante="primario" className="w-full" disabled={senha.length < 8} onClick={async () => {
          const { error } = await supabase().auth.updateUser({ password: senha });
          if (error) setMsg("Não foi possível salvar. Tente de novo.");
          else setAtivo(false);
        }}>Salvar senha</Botao>
      </div>
    </div>
  );
}

export async function sair() {
  await supabase().auth.signOut();
  location.hash = "";
  location.reload();
}

function Moldura({ children }: { children: ReactNode }) {
  return (
    <div className="bg-grid flex h-full flex-col items-center justify-center gap-8 p-6 text-center">
      <Marca />
      {children}
    </div>
  );
}
