# Guia Detalhado: Deploy no Portainer

Este guia mostra **passo a passo** como fazer o deploy do File Manager usando o Portainer.

## Pré-requisitos

Antes de começar, certifique-se de que:
- ✅ Portainer está instalado e acessível
- ✅ Traefik está rodando como reverse proxy
- ✅ A rede Docker `traefik` existe

### Verificar se a rede Traefik existe

Se você não tem certeza, acesse seu servidor via SSH e execute:

```bash
docker network ls | grep traefik
```

Se não aparecer nada, crie a rede:

```bash
docker network create traefik
```

---

## Passo 1: Acessar o Portainer

1. Abra seu navegador
2. Acesse o Portainer (exemplo: `http://seu-servidor:9000`)
3. Faça login com suas credenciais

---

## Passo 2: Criar uma Nova Stack

1. No menu lateral esquerdo, clique em **Stacks**
2. Clique no botão **+ Add stack** (canto superior direito)

---

## Passo 3: Configurar a Stack

### 3.1 Nome da Stack
- **Name**: Digite `file-manager` (ou o nome que preferir)

### 3.2 Método de Build
Você tem **duas opções**. Escolha a que preferir:

#### **Opção A: Usar Git Repository (Mais Fácil)** ⭐ Recomendado

1. Selecione **Git Repository**
2. Preencha os campos:
   - **Repository URL**: `https://github.com/BrunoMaiberg/file-manager`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `docker-compose.yml`
3. **Importante**: Role para baixo e encontre a seção **Environment variables**
4. Clique em **+ add an environment variable**
5. Adicione:
   - **name**: `DOMAIN`
   - **value**: `fms.seudominio.local` (substitua pelo seu domínio)

#### **Opção B: Web editor (Copiar e Colar)**

1. Selecione **Web editor**
2. Cole o conteúdo abaixo no editor:

```yaml
version: '3.8'

services:
  file-manager:
    image: node:18-alpine
    container_name: file-manager
    restart: unless-stopped
    working_dir: /app
    command: sh -c "apk add --no-cache ffmpeg git && git clone https://github.com/BrunoMaiberg/file-manager.git . && npm ci --only=production && npm start"
    ports:
      - "8181:8181"
    volumes:
      - file-manager-uploads:/app/uploads
    networks:
      - traefik
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.file-manager.rule=Host(`fms.seudominio.local`)"
      - "traefik.http.routers.file-manager.entrypoints=web"
      - "traefik.http.services.file-manager.loadbalancer.server.port=8181"

volumes:
  file-manager-uploads:

networks:
  traefik:
    external: true
```

3. **IMPORTANTE**: Edite a linha 19 e substitua `fms.seudominio.local` pelo seu domínio

---

## Passo 4: Configurar o Domínio

⚠️ **ATENÇÃO**: Você precisa definir qual domínio vai usar para acessar o File Manager.

### Exemplos de domínios:
- `fms.local` (acesso local)
- `files.meuservidor.local`
- `filemanager.casa.local`
- `fms.192.168.1.100.nip.io` (se quiser usar nip.io)

### Como editar:

**Se escolheu Opção A (Git Repository):**
- Você já adicionou a variável `DOMAIN` nas environment variables
- Mas ainda precisa editar o `docker-compose.yml` no GitHub primeiro!

**Se escolheu Opção B (Web editor):**
- Encontre a linha: `Host(\`fms.seudominio.local\`)`
- Substitua `fms.seudominio.local` pelo seu domínio

---

## Passo 5: Deploy da Stack

1. Role até o final da página
2. Clique no botão **Deploy the stack**
3. Aguarde o Portainer fazer o build e iniciar o container

---

## Passo 6: Verificar se Está Rodando

### 6.1 Ver Logs
1. Vá em **Stacks** → `file-manager`
2. Clique no container `file-manager`
3. Clique em **Logs**
4. Você deve ver algo como:
   ```
   File Manager server running on http://localhost:8181
   ```

### 6.2 Verificar Status
- O status do container deve estar **running** (verde)

---

## Passo 7: Configurar DNS Local

Para acessar via domínio, você precisa adicionar uma entrada no arquivo hosts do seu computador.

### Windows
1. Abra o Bloco de Notas **como Administrador**
2. Abra o arquivo: `C:\Windows\System32\drivers\etc\hosts`
3. Adicione no final:
   ```
   192.168.1.100  fms.seudominio.local
   ```
   (Substitua `192.168.1.100` pelo IP do seu servidor)
4. Salve o arquivo

### Linux/Mac
1. Abra o terminal
2. Execute:
   ```bash
   sudo nano /etc/hosts
   ```
3. Adicione no final:
   ```
   192.168.1.100  fms.seudominio.local
   ```
4. Salve (Ctrl+O, Enter, Ctrl+X)

---

## Passo 8: Acessar o File Manager

1. Abra seu navegador
2. Digite: `http://fms.seudominio.local` (use o domínio que você configurou)
3. O File Manager deve abrir! 🎉

---

## Troubleshooting

### ❌ "Site não encontrado" ou "Não foi possível conectar"

**Possíveis causas:**

1. **DNS não configurado**
   - Verifique se você adicionou a entrada no arquivo hosts
   - Tente acessar diretamente pelo IP: `http://IP-DO-SERVIDOR:8181`

2. **Traefik não está roteando**
   - Verifique se o Traefik está rodando: `docker ps | grep traefik`
   - Verifique se a rede `traefik` existe: `docker network ls | grep traefik`

3. **Container não está rodando**
   - No Portainer, vá em **Containers** e veja se `file-manager` está **running**
   - Se não estiver, clique nele e veja os logs

### ❌ Container fica reiniciando

1. No Portainer, vá em **Stacks** → `file-manager`
2. Clique no container
3. Vá em **Logs**
4. Procure por mensagens de erro

### ❌ Arquivos não persistem após reiniciar

- Verifique se o volume está configurado corretamente
- No Portainer, vá em **Volumes** e veja se `file-manager-uploads` existe

---

## Atualizar a Aplicação

Quando houver uma nova versão no GitHub:

1. Vá em **Stacks** → `file-manager`
2. Clique em **Editor**
3. Clique em **Pull and redeploy**
4. Aguarde o Portainer atualizar

---

## Resumo Rápido

1. ✅ Portainer → Stacks → Add stack
2. ✅ Nome: `file-manager`
3. ✅ Git Repository: `https://github.com/BrunoMaiberg/file-manager`
4. ✅ Edite o domínio (ou use variável de ambiente)
5. ✅ Deploy the stack
6. ✅ Configure o DNS local (arquivo hosts)
7. ✅ Acesse: `http://seu-dominio.local`

---

## Precisa de Ajuda?

Se tiver dúvidas, verifique:
- [DEPLOY.md](file:///d:/FileManager/DEPLOY.md) - Guia geral de deployment
- [README.md](file:///d:/FileManager/README.md) - Informações sobre o projeto
