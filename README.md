# File Manager - Gerenciador de Arquivos

Um gerenciador de arquivos web moderno e completo com interface premium, desenvolvido com Node.js e JavaScript vanilla.

## 🚀 Funcionalidades

- **📤 Upload de Arquivos**: Suporte a drag & drop e seleção múltipla
- **📥 Download**: Baixe arquivos individuais ou pastas inteiras (como ZIP)
- **📁 Gerenciamento de Pastas**: Crie, renomeie e exclua pastas
- **✂️ Copiar e Mover**: Copie ou mova arquivos e pastas entre diretórios
- **🔍 Busca**: Encontre arquivos rapidamente por nome
- **👁️ Ícones Personalizados**: Ícones diferentes para cada tipo de arquivo
- **🎨 Interface Premium**: Design moderno com tema escuro e animações suaves
- **📱 Responsivo**: Funciona perfeitamente em desktop e mobile

## 🛠️ Tecnologias

- **Backend**: Node.js + Express
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Upload**: Multer
- **Compressão**: Archiver (para download de pastas)

## 📦 Instalação

### Instalação Rápida

```bash
npm install
npm start
```

O servidor iniciará em `http://localhost:3000`

### Guia Completo de Instalação

Para instruções detalhadas de instalação no Windows e Linux, incluindo:
- Instalação do Node.js
- Configuração em produção
- Docker
- Solução de problemas

**Consulte o arquivo [INSTALL.md](INSTALL.md)**

## 📖 Como Usar

### Upload de Arquivos
- Clique no botão "Upload" e selecione os arquivos
- Ou arraste e solte arquivos diretamente na janela

### Criar Pasta
- Clique no botão "Nova Pasta"
- Digite o nome e confirme

### Navegar
- Clique duas vezes em uma pasta para abri-la
- Use a navegação breadcrumb no topo para voltar

### Operações com Arquivos
- Clique com botão direito em um arquivo/pasta para ver as opções:
  - **Download**: Baixar o arquivo ou pasta
  - **Renomear**: Alterar o nome
  - **Copiar**: Copiar para outro local
  - **Mover**: Mover para outro local
  - **Excluir**: Remover permanentemente

### Buscar
- Digite na barra de busca para encontrar arquivos
- A busca é feita recursivamente em todas as subpastas

## 📂 Estrutura do Projeto

```
FileManager/
├── public/
│   ├── index.html      # Interface do usuário
│   ├── styles.css      # Estilos premium
│   └── app.js          # Lógica da aplicação
├── uploads/            # Diretório de armazenamento (criado automaticamente)
├── server.js           # Servidor Express
├── package.json        # Dependências
└── README.md          # Este arquivo
```

## 🔒 Segurança

- Validação de caminhos para prevenir directory traversal
- Sanitização de nomes de arquivos
- CORS habilitado para desenvolvimento local

## 🎨 Design

A interface utiliza:
- Tema escuro moderno
- Gradientes vibrantes (roxo/azul)
- Efeitos glassmorphism
- Animações suaves e micro-interações
- Tipografia Inter do Google Fonts
- Ícones SVG customizados

## 📝 API Endpoints

- `GET /api/files?path=` - Listar arquivos
- `POST /api/upload` - Upload de arquivos
- `GET /api/download?path=` - Download
- `POST /api/folder` - Criar pasta
- `DELETE /api/delete?path=` - Excluir
- `PUT /api/rename` - Renomear
- `POST /api/move` - Mover
- `POST /api/copy` - Copiar
- `GET /api/search?q=&path=` - Buscar

## 🚀 Melhorias Futuras

- Autenticação de usuários
- Compartilhamento de arquivos
- Preview de imagens e documentos
- Edição de arquivos de texto
- Múltiplas seleções
- Histórico de ações (undo/redo)
- Integração com cloud storage

## 📄 Licença

MIT License - Sinta-se livre para usar e modificar!

---

Desenvolvido com ❤️ usando Node.js e JavaScript
