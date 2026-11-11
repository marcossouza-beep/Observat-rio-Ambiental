#!/usr/bin/env bash
# Cria, de uma vez, o servidor no Brasil na Oracle Cloud (camada gratuita), sem formulários:
# rede com saída para a internet, sub-rede pública, máquina Ubuntu e o cadastro no GitHub (rótulo "brasil").
#
# Uso, no Cloud Shell do Oracle (ícone >_ no topo do console), com o token da tela "New self-hosted runner":
#   curl -fsSL https://raw.githubusercontent.com/marcossouza-beep/Observat-rio-Ambiental/claude/project-evaluation-roadmap-h09v0c/infra/oracle-criar-servidor.sh | bash -s -- SEU_TOKEN [TENTATIVAS]
#
# Pode rodar de novo: reaproveita a rede "observatorio-rede" se já existir. A máquina instala tudo sozinha
# ao ligar (infra/servidor-brasil.sh) e aparece no GitHub em 10 a 15 minutos.
set -euo pipefail

TOKEN="${1:-}"
NOME="observatorio-brasil"
REDE="observatorio-rede"
SCRIPT_URL="https://raw.githubusercontent.com/marcossouza-beep/Observat-rio-Ambiental/claude/project-evaluation-roadmap-h09v0c/infra/servidor-brasil.sh"

passo() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
falha() { printf '\n\033[31mParou: %s\033[0m\n' "$*"; exit 1; }

[ -n "$TOKEN" ] || falha "falta o token do GitHub. Uso: ... | bash -s -- SEU_TOKEN"
command -v oci >/dev/null || falha "rode este comando no Cloud Shell do Oracle (ícone >_ no topo do console)."
C="${OCI_TENANCY:-}"
[ -n "$C" ] || falha "não encontrei a conta (OCI_TENANCY). Rode no Cloud Shell do Oracle."
REGIAO="${OCI_REGION:-}"
case "$REGIAO" in
  sa-saopaulo-1 | sa-vinhedo-1) ;;
  *) falha "a região do Cloud Shell é '${REGIAO:-desconhecida}'. Troque para Brazil East (São Paulo) no canto superior direito e abra o Cloud Shell de novo." ;;
esac

passo "Rede ($REDE) em $REGIAO"
VCN="$(oci network vcn list -c "$C" --display-name "$REDE" --lifecycle-state AVAILABLE --query 'data[0].id' --raw-output 2>/dev/null || true)"
if [ -z "$VCN" ] || [ "$VCN" = "null" ]; then
  VCN="$(oci network vcn create -c "$C" --display-name "$REDE" --cidr-blocks '["10.20.0.0/16"]' --dns-label obsrede \
    --wait-for-state AVAILABLE --query 'data.id' --raw-output)"
fi
echo "  rede: $VCN"

passo "Saída para a internet"
IGW="$(oci network internet-gateway list -c "$C" --vcn-id "$VCN" --query 'data[0].id' --raw-output 2>/dev/null || true)"
if [ -z "$IGW" ] || [ "$IGW" = "null" ]; then
  IGW="$(oci network internet-gateway create -c "$C" --vcn-id "$VCN" --is-enabled true --display-name "$REDE-internet" \
    --wait-for-state AVAILABLE --query 'data.id' --raw-output)"
fi
RT="$(oci network vcn get --vcn-id "$VCN" --query 'data."default-route-table-id"' --raw-output)"
oci network route-table update --rt-id "$RT" --force \
  --route-rules "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW\"}]" >/dev/null
echo "  ok"

passo "Sub-rede pública"
SUB="$(oci network subnet list -c "$C" --vcn-id "$VCN" --display-name "$REDE-publica" --query 'data[0].id' --raw-output 2>/dev/null || true)"
if [ -z "$SUB" ] || [ "$SUB" = "null" ]; then
  SUB="$(oci network subnet create -c "$C" --vcn-id "$VCN" --display-name "$REDE-publica" --cidr-block 10.20.0.0/24 \
    --dns-label publica --prohibit-public-ip-on-vnic false --wait-for-state AVAILABLE --query 'data.id' --raw-output)"
fi
echo "  sub-rede: $SUB"

passo "Chave de acesso (fica guardada no seu Cloud Shell)"
[ -f "$HOME/.ssh/id_rsa.pub" ] || ssh-keygen -t rsa -b 4096 -N '' -f "$HOME/.ssh/id_rsa" -q
echo "  ok"

passo "Script que roda quando a máquina liga"
INICIO="$(mktemp)"
printf '#!/bin/bash\ncurl -fsSL %s | bash -s -- %s\n' "$SCRIPT_URL" "$TOKEN" > "$INICIO"
echo "  ok"

AD="$(oci iam availability-domain list -c "$C" --query 'data[0].name' --raw-output)"

ERRO="$(mktemp)"
# lancar roda dentro de $(...), um subprocesso: os motivos vão para um arquivo, não para uma variável
MOTIVOS="$(mktemp)"

lancar() { # forma, configuração da forma (ou vazio). Escreve o id da máquina; em falha, guarda o motivo em MOTIVOS.
  local forma="$1" config="$2" imagem="" versao
  for versao in 24.04 22.04; do
    imagem="$(oci compute image list -c "$C" --operating-system "Canonical Ubuntu" --operating-system-version "$versao" \
      --shape "$forma" --sort-by TIMECREATED --sort-order DESC --limit 1 --query 'data[0].id' --raw-output 2>/dev/null || true)"
    [ -n "$imagem" ] && [ "$imagem" != "null" ] && break
    imagem=""
  done
  if [ -z "$imagem" ]; then
    echo "$forma: não há imagem Ubuntu compatível nesta região" >>"$MOTIVOS"
    return 1
  fi
  local extra=()
  [ -n "$config" ] && extra=(--shape-config "$config")
  if oci compute instance launch -c "$C" --availability-domain "$AD" --display-name "$NOME" \
    --shape "$forma" ${extra[@]+"${extra[@]}"} --image-id "$imagem" --subnet-id "$SUB" --assign-public-ip true \
    --ssh-authorized-keys-file "$HOME/.ssh/id_rsa.pub" --user-data-file "$INICIO" \
    --wait-for-state RUNNING --query 'data.id' --raw-output 2>"$ERRO"; then
    return 0
  fi
  # A resposta de erro do Oracle traz "code" e "message"; guarda os dois para explicar o motivo
  local codigo mensagem
  codigo="$(grep -o '"code": "[^"]*"' "$ERRO" | head -1 | cut -d'"' -f4)"
  mensagem="$(grep -o '"message": "[^"]*"' "$ERRO" | head -1 | cut -d'"' -f4)"
  echo "$forma: ${codigo:-erro} ${mensagem:-$(head -c 300 "$ERRO" | tr '\n' ' ')}" >>"$MOTIVOS"
  return 1
}

passo "Máquinas que já existem na conta"
# shellcheck disable=SC2016  # crases são literais do filtro JMESPath do Oracle, não do bash
oci compute instance list -c "$C" --query 'data[?"lifecycle-state"!=`TERMINATED`].["display-name",shape,"lifecycle-state"]' \
  --output table 2>/dev/null || echo "  (não consegui listar)"
JA="$(oci compute instance list -c "$C" --display-name "$NOME" --lifecycle-state RUNNING --query 'data[0].id' --raw-output 2>/dev/null || true)"
if [ -n "$JA" ] && [ "$JA" != "null" ]; then
  falha "já existe uma máquina '$NOME' ligada. Se ela não apareceu no GitHub, apague-a em Compute → Instances (Terminate) e rode de novo com um token novo."
fi

# Tentativas: o segundo argumento diz quantas (padrão 1). Entre uma e outra, espera 2 minutos.
TENTATIVAS="${2:-1}"
ID=""
for ((n = 1; n <= TENTATIVAS; n++)); do
  passo "Máquina ($NOME), camada gratuita · tentativa $n de $TENTATIVAS"
  : >"$MOTIVOS"
  if ID="$(lancar VM.Standard.E2.1.Micro '')"; then
    echo "  máquina AMD gratuita criada: $ID"
    break
  elif ID="$(lancar VM.Standard.A1.Flex '{"ocpus":1,"memoryInGBs":6}')"; then
    echo "  máquina ARM gratuita criada: $ID"
    break
  fi
  ID=""
  while IFS= read -r m; do echo "  recusada · $m"; done <"$MOTIVOS"
  if ((n < TENTATIVAS)); then echo "  nova tentativa em 2 minutos..."; sleep 120; fi
done
rm -f "$ERRO" "$MOTIVOS"
if [ -z "$ID" ]; then
  rm -f "$INICIO"
  falha "o Oracle recusou as duas máquinas gratuitas (motivos acima). \"Out of host capacity\" passa com o tempo: rode de novo, ou com mais tentativas (ex.: ... | bash -s -- SEU_TOKEN 20). \"LimitExceeded\": apague máquinas antigas em Compute → Instances."
fi
rm -f "$INICIO"

IP="$(oci compute instance list-vnics --instance-id "$ID" --query 'data[0]."public-ip"' --raw-output 2>/dev/null || true)"
passo "Pronto"
echo "  IP público: ${IP:-ainda sendo atribuído}"
echo "  A máquina agora instala tudo sozinha. Em 10 a 15 minutos ela aparece como Idle em:"
echo "  https://github.com/marcossouza-beep/Observat-rio-Ambiental/settings/actions/runners"
