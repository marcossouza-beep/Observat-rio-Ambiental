#!/usr/bin/env bash
# Prepara o servidor no Brasil e o cadastra como executor do GitHub (rótulo "brasil").
# Uso, na máquina nova (Ubuntu 22.04 ou 24.04), com o token da tela "New self-hosted runner":
#   curl -fsSL https://raw.githubusercontent.com/marcossouza-beep/Observat-rio-Ambiental/claude/project-evaluation-roadmap-h09v0c/infra/servidor-brasil.sh | sudo bash -s -- SEU_TOKEN
# Pode rodar de novo sem problema (por exemplo, com um token novo).
set -euo pipefail

REPO_URL="https://github.com/marcossouza-beep/Observat-rio-Ambiental"
USUARIO="github"
PASTA="/home/$USUARIO/actions-runner"
PLAYWRIGHT="1.58.2" # mesma versão de web/package.json
TOKEN="${1:-}"

passo() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo."; exit 1; }
[ -n "$TOKEN" ] || { echo "Falta o token. Uso: ... | sudo bash -s -- SEU_TOKEN"; exit 1; }
. /etc/os-release
[ "${ID:-}" = "ubuntu" ] || echo "Aviso: testado em Ubuntu; este sistema é ${PRETTY_NAME:-desconhecido}."

case "$(uname -m)" in
  x86_64) ARQ=x64 ;;
  aarch64 | arm64) ARQ=arm64 ;;
  *) echo "Arquitetura não suportada: $(uname -m)"; exit 1 ;;
esac

passo "Fuso horário de Brasília"
timedatectl set-timezone America/Sao_Paulo 2>/dev/null || true

passo "Pacotes básicos"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl tar jq ca-certificates unattended-upgrades

passo "Memória de troca (máquinas de 1 GB precisam para instalar as dependências)"
if [ "$(swapon --show --noheadings | wc -l)" -eq 0 ] && [ "$(awk '/MemTotal/ {print $2}' /proc/meminfo)" -lt 3000000 ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

passo "Node 22 e pnpm"
if ! node -v 2>/dev/null | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
corepack enable

passo "Bibliotecas do Chromium (levantamento com navegador)"
npx -y "playwright@$PLAYWRIGHT" install-deps chromium

passo "Usuário $USUARIO (o executor não roda como root)"
id "$USUARIO" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$USUARIO"

passo "Executor do GitHub"
VERSAO="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/^v//')"
[ -n "$VERSAO" ] && [ "$VERSAO" != "null" ] || { echo "Não consegui saber a versão do executor."; exit 1; }
mkdir -p "$PASTA"
if [ ! -x "$PASTA/config.sh" ]; then
  curl -fsSL -o /tmp/runner.tar.gz \
    "https://github.com/actions/runner/releases/download/v$VERSAO/actions-runner-linux-$ARQ-$VERSAO.tar.gz"
  tar -xzf /tmp/runner.tar.gz -C "$PASTA" && rm -f /tmp/runner.tar.gz
fi
chown -R "$USUARIO:$USUARIO" "/home/$USUARIO"
"$PASTA/bin/installdependencies.sh" >/dev/null

if [ -f "$PASTA/.runner" ]; then
  # Já cadastrado antes: para o serviço e recadastra com o token novo (--replace troca o antigo no GitHub)
  cd "$PASTA"
  ./svc.sh stop >/dev/null 2>&1 || true
  ./svc.sh uninstall >/dev/null 2>&1 || true
  rm -f .runner .credentials .credentials_rsaparams
  cd /
fi
sudo -u "$USUARIO" bash -c "cd '$PASTA' && ./config.sh --unattended --replace \
  --url '$REPO_URL' --token '$TOKEN' --labels brasil --name 'brasil-$(hostname -s)' --work _work"
(cd "$PASTA" && ./svc.sh install "$USUARIO" && ./svc.sh start)

passo "Assembleias que bloqueiam acesso de fora: respondem daqui?"
for u in \
  AP=https://www.al.ap.leg.br/ MA=https://www.al.ma.leg.br/ PE=https://www.alepe.pe.gov.br/ \
  RN=https://www.al.rn.leg.br/ DF=https://www.cl.df.gov.br/ ES=https://www.al.es.gov.br/ \
  RS=https://ww4.al.rs.gov.br/ GO=https://portal.al.go.leg.br/ \
  RJ='http://alerjln1.alerj.rj.gov.br/scpro2327.nsf/Internet/LeiInt?OpenForm'; do
  uf="${u%%=*}"; url="${u#*=}"
  cod="$(curl -s -o /dev/null -m 30 -L -A 'Mozilla/5.0' -w '%{http_code}' "$url" || true)"
  printf '  %s  %s  %s\n' "$uf" "${cod:-sem resposta}" "$url"
done

passo "Pronto"
echo "O executor 'brasil-$(hostname -s)' deve aparecer como Idle em:"
echo "  $REPO_URL/settings/actions/runners"
