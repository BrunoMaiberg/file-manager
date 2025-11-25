# Guia de Instalação e Execução - File Manager

## 📋 Pré-requisitos

Antes de começar, você precisa ter instalado:

- **Node.js** (versão 14 ou superior)
- **npm** (geralmente vem com o Node.js)
- **Git** (opcional, para clonar o repositório)

### Verificar se está instalado

```bash
node --version
npm --version
```

---

## 🪟 Instalação no Windows

### 1. Instalar Node.js (se ainda não tiver)

1. Acesse [nodejs.org](https://nodejs.org)
2. Baixe a versão LTS (recomendada)
3. Execute o instalador
4. Siga as instruções (deixe as opções padrão marcadas)
5. Reinicie o terminal/PowerShell

### 2. Preparar o Projeto

**Opção A: Se você já tem os arquivos**
```powershell
# Navegue até a pasta do projeto
cd D:\FileManager
```

**Opção B: Criar do zero**
```powershell
# Crie uma pasta para o projeto
mkdir FileManager
cd FileManager

# Copie todos os arquivos do projeto para esta pasta
# (server.js, package.json, public/, etc.)
```

### 3. Instalar Dependências

```powershell
npm install
```

Isso instalará:
- express
- multer
- cors
- archiver

### 4. Executar o Servidor

```powershell
npm start
```

Você verá:
```
File Manager server running on http://localhost:3000
Upload directory: D:\FileManager\uploads
```

### 5. Acessar o Sistema

Abra seu navegador e acesse:
```
http://localhost:3000
```

### 6. Parar o Servidor

Pressione `Ctrl + C` no terminal

---

## 🐧 Instalação no Linux

### 1. Instalar Node.js (se ainda não tiver)

**Ubuntu/Debian:**
```bash
# Atualizar repositórios
sudo apt update

# Instalar Node.js e npm
sudo apt install nodejs npm -y

# Verificar instalação
node --version
npm --version
```

**CentOS/RHEL/Fedora:**
```bash
# Instalar Node.js
sudo dnf install nodejs npm -y

# Verificar instalação
node --version
npm --version
```

**Usando NVM (recomendado para qualquer distro):**
```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recarregar terminal
source ~/.bashrc

# Instalar Node.js LTS
nvm install --lts

# Usar a versão instalada
nvm use --lts
```

### 2. Preparar o Projeto

```bash
# Criar diretório do projeto
mkdir -p ~/FileManager
cd ~/FileManager

# Se estiver clonando de um repositório
# git clone <url-do-repositorio> .

# Ou copie os arquivos manualmente para esta pasta
```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Executar o Servidor

```bash
npm start
```

Você verá:
```
File Manager server running on http://localhost:3000
Upload directory: /home/seu-usuario/FileManager/uploads
```

### 5. Acessar o Sistema

Abra seu navegador e acesse:
```
http://localhost:3000
```

### 6. Parar o Servidor

Pressione `Ctrl + C` no terminal

---

## 🚀 Executar em Segundo Plano (Linux)

### Usando PM2 (Recomendado para Produção)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar aplicação
pm2 start server.js --name "file-manager"

# Ver status
pm2 status

# Ver logs
pm2 logs file-manager

# Parar aplicação
pm2 stop file-manager

# Reiniciar aplicação
pm2 restart file-manager

# Configurar para iniciar com o sistema
pm2 startup
pm2 save
```

### Usando nohup (Alternativa Simples)

```bash
# Iniciar em segundo plano
nohup npm start > output.log 2>&1 &

# Ver o PID do processo
echo $!

# Parar (substitua PID pelo número retornado)
kill PID
```

---

## 🔧 Configurações Avançadas

### Mudar a Porta do Servidor

Edite o arquivo `server.js`:

```javascript
const PORT = 3000; // Mude para a porta desejada
```

### Mudar o Diretório de Upload

Edite o arquivo `server.js`:

```javascript
const UPLOAD_DIR = path.join(__dirname, 'uploads'); 
// Mude para: const UPLOAD_DIR = '/caminho/desejado';
```

### Permitir Acesso Externo (Rede Local)

Por padrão, o servidor aceita conexões apenas de localhost. Para permitir acesso de outros computadores na rede:

Edite `server.js`:

```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`File Manager server running on http://0.0.0.0:${PORT}`);
});
```

Depois acesse de outro computador usando:
```
http://IP-DO-SERVIDOR:3000
```

---

## 🐳 Executar com Docker (Opcional)

### 1. Criar Dockerfile

Crie um arquivo chamado `Dockerfile` na raiz do projeto:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### 2. Criar docker-compose.yml

```yaml
version: '3.8'

services:
  file-manager:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
```

### 3. Executar

```bash
# Construir e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

---

## 🔒 Segurança (Produção)

### 1. Usar HTTPS

Instale um certificado SSL (Let's Encrypt recomendado):

```bash
# Instalar certbot
sudo apt install certbot

# Obter certificado
sudo certbot certonly --standalone -d seu-dominio.com
```

### 2. Configurar Firewall

**Linux (UFW):**
```bash
sudo ufw allow 3000/tcp
sudo ufw enable
```

**Windows:**
```powershell
# Abrir porta no firewall
New-NetFirewallRule -DisplayName "File Manager" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 3. Usar Reverse Proxy (Nginx)

Exemplo de configuração Nginx:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📁 Estrutura de Arquivos

```
FileManager/
├── server.js              # Servidor backend
├── package.json           # Dependências do projeto
├── .gitignore            # Arquivos ignorados pelo Git
├── README.md             # Documentação
├── public/               # Arquivos frontend
│   ├── index.html        # Interface principal
│   ├── styles.css        # Estilos
│   └── app.js            # Lógica frontend
└── uploads/              # Arquivos enviados (criado automaticamente)
    └── .temp/            # Pasta temporária (criada automaticamente)
```

---

## ❓ Solução de Problemas

### Erro: "porta já em uso"

**Windows:**
```powershell
# Encontrar processo usando a porta 3000
netstat -ano | findstr :3000

# Matar processo (substitua PID)
taskkill /PID <PID> /F
```

**Linux:**
```bash
# Encontrar processo
lsof -i :3000

# Matar processo
kill -9 <PID>
```

### Erro: "EACCES: permission denied"

**Linux:**
```bash
# Dar permissões à pasta
chmod -R 755 ~/FileManager
```

### Erro: "npm: command not found"

Reinstale o Node.js ou adicione ao PATH:

**Linux:**
```bash
export PATH=$PATH:/usr/local/bin
```

**Windows:**
Adicione `C:\Program Files\nodejs` às variáveis de ambiente

### Arquivos não aparecem após upload

1. Verifique os logs do servidor no terminal
2. Abra o console do navegador (F12)
3. Verifique se a pasta `uploads` existe
4. Reinicie o servidor

---

## 🔄 Atualizar o Sistema

```bash
# Parar o servidor (Ctrl + C)

# Atualizar código (se usando Git)
git pull

# Reinstalar dependências (se package.json mudou)
npm install

# Reiniciar servidor
npm start
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Abra o console do navegador (F12)
3. Verifique se todas as dependências foram instaladas
4. Certifique-se de que a porta 3000 está livre

---

## 📝 Comandos Rápidos

### Windows
```powershell
cd D:\FileManager
npm install
npm start
```

### Linux
```bash
cd ~/FileManager
npm install
npm start
```

### Acessar
```
http://localhost:3000
```

---

**Desenvolvido com ❤️ usando Node.js e JavaScript**
