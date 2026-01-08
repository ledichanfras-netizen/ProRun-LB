# ProRun AI Coach

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

Uma plataforma integrada de alta performance para treinamento esportivo, com geração de planilhas personalizadas usando inteligência artificial.

## Funcionalidades

- ✅ Geração de planilhas de treinamento personalizadas com IA
- ✅ Avaliação e acompanhamento de desempenho dos atletas
- ✅ Exportação de planilhas em PDF
- ✅ Portal exclusivo para atletas
- ✅ Biblioteca de treinos
- ✅ Sistema de periodização avançada

## Instalação Local

1. Clone este repositório:
```bash
git clone <url-do-repositorio>
cd prorun-ai-coach
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Deploy no Vercel

1. Faça login no Vercel CLI:
```bash
npm i -g vercel
vercel login
```

2. Envie seu projeto para deploy:
```bash
vercel
```

3. Ou conecte diretamente ao GitHub para deploy automático.

### Variáveis de Ambiente Necessárias

Para deploy no Vercel, configure estas variáveis nas configurações do projeto:

- `VITE_FIREBASE_API_KEY` - Sua chave de API do Firebase
- `VITE_FIREBASE_AUTH_DOMAIN` - Domínio de autenticação do Firebase
- `VITE_FIREBASE_PROJECT_ID` - ID do projeto Firebase
- `VITE_FIREBASE_STORAGE_BUCKET` - Bucket de armazenamento
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - ID do remetente
- `VITE_FIREBASE_APP_ID` - ID do app
- `VITE_GEMINI_API_KEY` - Chave da API Google Gemini (opcional)

## Tecnologias Utilizadas

- React 19 com TypeScript
- Vite como bundler
- Tailwind CSS para estilização
- Firebase Firestore para armazenamento
- Google Gemini para IA
- jsPDF e html2canvas para exportação em PDF
- Recharts para visualização de dados
- Lucide React para ícones

## Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
├── pages/          # Páginas da aplicação
├── services/       # Serviços (Firebase, IA)
├── utils/          # Funções utilitárias
├── context/        # Contextos globais
├── types.ts        # Tipos TypeScript
└── assets/         # Recursos estáticos
```

## Exportação de PDF

A funcionalidade de exportação para PDF está implementada e utiliza:
- html2canvas para capturar o conteúdo HTML
- jsPDF para gerar o arquivo PDF
- Como fallback, o sistema também oferece a opção de impressão nativa do navegador

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob os termos especificados pelo proprietário.

---

View your app in AI Studio: https://ai.studio/apps/drive/1tPht8fUTcY5xfjU2h3Em5WipVb3F3D0B
