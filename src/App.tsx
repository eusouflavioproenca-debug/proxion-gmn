import { Component, useMemo, type ReactNode } from "react";
import { AvisosProvider, Botao, Carregando, Marca } from "./ui/kit";
import { StoreProvider, useStore } from "./data/store";
import { BancoMemoria, BancoSupabase } from "./data/banco";
import { DialogosProvider } from "./features/Dialogos";
import { Shell } from "./features/Shell";
import { Inicio } from "./features/Inicio";
import { Empresas } from "./features/Empresas";
import { Ficha } from "./features/Ficha";
import { Radar } from "./features/Radar";
import { Servicos, ServicoPagina } from "./features/Servicos";
import { Ajustes, Compartilhadas, Financeiro } from "./features/Outras";
import { NovaSenha, PortaoLogin, sair } from "./features/login/Login";
import { useRota } from "./lib/rota";
import { dadosExemplo } from "./data/exemplo";
import { supabase } from "./data/supabase";

const PREVIEW = import.meta.env.MODE === "preview";

function Telas({ sairFn }: { sairFn?: () => void }) {
  const rota = useRota();
  const { pronto } = useStore();
  if (!pronto) return <div className="flex h-full items-center justify-center"><Carregando texto="Carregando" /></div>;
  return (
    <Shell sair={sairFn}>
      {rota.nome === "inicio" && <Inicio />}
      {rota.nome === "radar" && <Radar />}
      {rota.nome === "empresas" && <Empresas />}
      {rota.nome === "empresa" && <Ficha id={rota.id} />}
      {rota.nome === "servicos" && <Servicos />}
      {rota.nome === "servico" && <ServicoPagina id={rota.id} />}
      {rota.nome === "financeiro" && <Financeiro />}
      {rota.nome === "compartilhadas" && <Compartilhadas />}
      {rota.nome === "ajustes" && <Ajustes sair={sairFn} />}
    </Shell>
  );
}

function ComBanco({ preview }: { preview: boolean }) {
  const banco = useMemo(() => (preview ? new BancoMemoria(dadosExemplo()) : new BancoSupabase(supabase())), [preview]);
  return (
    <StoreProvider banco={banco} ia={!preview} preview={preview}>
      <DialogosProvider>
        <Telas sairFn={preview ? undefined : () => void sair()} />
        {!preview && <NovaSenha />}
      </DialogosProvider>
    </StoreProvider>
  );
}

class ErroGlobal extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null };
  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Marca />
        <p className="text-[20px] font-semibold">Algo saiu do lugar nesta tela</p>
        <Botao variante="primario" onClick={() => { this.setState({ erro: null }); location.hash = "inicio"; }}>Voltar ao início</Botao>
        <p className="max-w-md break-words font-mono text-[11px] text-dim">{this.state.erro.message}</p>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErroGlobal>
      <AvisosProvider>
        {PREVIEW ? <ComBanco preview /> : <PortaoLogin>{(s) => <ComBancoKey key={s.user.id} />}</PortaoLogin>}
      </AvisosProvider>
    </ErroGlobal>
  );
}
const ComBancoKey = () => <ComBanco preview={false} />;
