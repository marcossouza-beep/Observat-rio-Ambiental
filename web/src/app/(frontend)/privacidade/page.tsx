import type { Metadata } from 'next'
import { Trilha } from '@/componentes/Trilha'
import { NOME_SITE } from '@/lib/rotulos'

export const metadata: Metadata = { title: 'Política de Privacidade', alternates: { canonical: '/privacidade' } }

/* Texto-base. Deve ser revisado pelo autor (responsável pelo tratamento) antes do lançamento. */
export default function Privacidade() {
  return (
    <div className="wrap">
      <Trilha itens={[{ nome: 'Política de Privacidade', caminho: '/privacidade' }]} />
      <header className="lawhead">
        <h1>Política de Privacidade</h1>
        <p className="nota-fonte">Versão 1.0</p>
      </header>
      <div className="texto-legal">
        <p>
          {NOME_SITE} é um projeto pessoal e independente. Esta política explica quais dados pessoais tratamos, para quê e quais são os seus direitos, conforme a Lei Geral de Proteção de Dados
          (Lei nº 13.709/2018).
        </p>
        <h2>Quem trata os dados</h2>
        <p>O responsável pelo tratamento é o autor do observatório, identificado na página do autor. Contato para assuntos de dados pessoais: pelo e-mail indicado no rodapé dos nossos e-mails.</p>
        <h2>Quais dados e para quê</h2>
        <ul>
          <li>
            <b>Inscrição:</b> nome, e-mail, perfil (e subgrupo ou curso), estado, temas e biomas de interesse — para enviar os materiais, os alertas e o resumo que você escolheu, e para entender
            quem acompanha o observatório.
          </li>
          <li>
            <b>Credenciamento de imprensa:</b> veículo, função, link de comprovação, e-mail profissional e registro — para verificar o vínculo com um veículo.
          </li>
          <li>
            <b>Pedidos de correção:</b> e-mail e o texto enviado — para responder e registrar a correção.
          </li>
          <li>
            <b>Registro de envios:</b> quais e-mails foram enviados e se foram entregues — para garantir a entrega e atender pedidos de descadastro.
          </li>
        </ul>
        <p>A base legal é o seu consentimento, registrado com data na inscrição. Não vendemos nem compartilhamos seus dados para publicidade.</p>
        <h2>Com quem compartilhamos</h2>
        <p>Só com os serviços que fazem o site funcionar: hospedagem, banco de dados e envio de e-mails. Eles tratam os dados apenas para prestar o serviço.</p>
        <h2>Por quanto tempo</h2>
        <p>Enquanto a inscrição estiver ativa. O conteúdo dos e-mails enviados é apagado em 30 dias; fica só o registro do envio.</p>
        <h2>Seus direitos</h2>
        <ul>
          <li>Parar de receber e-mails com um clique, em qualquer e-mail.</li>
          <li>Ver, corrigir e baixar seus dados em “Minha conta”.</li>
          <li>Excluir sua inscrição a qualquer momento em “Minha conta”.</li>
          <li>Fazer outros pedidos sobre seus dados; respondemos em até 15 dias.</li>
        </ul>
        <h2>Cookies</h2>
        <p>Usamos um único cookie, necessário para manter você conectado depois de entrar. Não usamos cookies de publicidade.</p>
      </div>
    </div>
  )
}
