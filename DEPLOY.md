# Guia de Deploy - File Manager no Portainer com Traefik

Este guia mostra como fazer o deploy do File Manager em um servidor local rodando Portainer e Traefik.

## Pré-requisitos

- Portainer instalado e rodando
- Traefik configurado como reverse proxy
- Rede Docker `traefik` criada e conectada ao Traefik

## Opção 1: Deploy via Portainer (Recomendado)

### 1. Preparar o Repositório

Certifique-se de que seu código está no GitHub:
```
https://github.com/BrunoMaiberg/file-manager
```

### 2. Criar Stack no Portainer

1. Acesse o Portainer
2. Vá em **Stacks** → **Add stack**
3. Nome: `file-manager`
4. Escolha **Git Repository**
5. Preencha:
   - **Repository URL**: `https://github.com/BrunoMaiberg/file-manager`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `docker-compose.yml`

### 3. Configurar Variáveis de Ambiente (Opcional)

Se quiser personalizar, adicione em **Environment variables**:
```
DOMAIN=fms.seudominio.local
```

### 4. Editar o docker-compose.yml

Antes de fazer o deploy, você precisa editar o domínio no `docker-compose.yml`:

```yaml
- "traefik.http.routers.file-manager.rule=Host(`fms.seudominio.local`)"
```

Substitua `fms.local.example.com` pelo seu domínio local.

### 5. Deploy

Clique em **Deploy the stack**

## Opção 2: Deploy Manual via Docker Compose

### 1. Clonar o Repositório no Servidor

```bash
cd /opt
git clone https://github.com/BrunoMaiberg/file-manager.git
cd file-manager
```

### 2. Editar o docker-compose.yml

Edite o arquivo e altere o domínio:

```bash
nano docker-compose.yml
```

Altere a linha:
```yaml
- "traefik.http.routers.file-manager.rule=Host(`fms.seudominio.local`)"
```

### 3. Criar a Rede Traefik (se não existir)

```bash
docker network create traefik
```

### 4. Fazer o Deploy

```bash
docker-compose up -d
```

## Configuração do Traefik

### Verificar se a Rede Existe

```bash
docker network ls | grep traefik
```

Se não existir, crie:
```bash
docker network create traefik
```

### Conectar o Traefik à Rede (se necessário)

```bash
docker network connect traefik traefik
```

## Configuração de DNS Local

Para acessar via domínio local, adicione no arquivo hosts do seu computador:

**Windows**: `C:\Windows\System32\drivers\etc\hosts`
**Linux/Mac**: `/etc/hosts`

```
192.168.1.100  fms.seudominio.local
```

Substitua `192.168.1.100` pelo IP do seu servidor.

## Verificação

### 1. Verificar se o Container Está Rodando

```bash
docker ps | grep file-manager
```

### 2. Verificar Logs

```bash
docker logs file-manager
```

### 3. Acessar a Aplicação

Abra o navegador e acesse:
```
http://fms.seudominio.local
```

## Persistência de Dados

Os arquivos enviados são salvos no volume:
```
./uploads:/app/uploads
```

Isso significa que os dados persistem mesmo se o container for reiniciado.

## HTTPS (Opcional)

Se você tem certificados SSL configurados no Traefik, descomente as linhas no `docker-compose.yml`:

```yaml
# - "traefik.http.routers.file-manager-secure.rule=Host(`fms.seudominio.local`)"
# - "traefik.http.routers.file-manager-secure.entrypoints=websecure"
# - "traefik.http.routers.file-manager-secure.tls=true"
```

## Atualização

Para atualizar a aplicação:

### Via Portainer
1. Vá em **Stacks** → `file-manager`
2. Clique em **Pull and redeploy**

### Via Docker Compose
```bash
cd /opt/file-manager
git pull
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

### Container não inicia
```bash
docker logs file-manager
```

### Traefik não roteia
Verifique se:
1. A rede `traefik` existe e está conectada
2. O domínio está correto no `docker-compose.yml`
3. O Traefik está rodando e conectado à mesma rede

### Arquivos não persistem
Verifique se o volume está montado corretamente:
```bash
docker inspect file-manager | grep -A 10 Mounts
```

## Suporte

Para mais informações, consulte:
- [README.md](file:///d:/FileManager/README.md)
- [INSTALL.md](file:///d:/FileManager/INSTALL.md)
