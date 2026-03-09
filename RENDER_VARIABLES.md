# Configuração de Variáveis de Ambiente no Render

Para que a sincronização em nuvem e os recursos de IA funcionem corretamente, as seguintes variáveis devem ser configuradas no painel do Render (Dashboard > Web Service > Environment):

## Firebase
- `VITE_FIREBASE_API_KEY`: Sua API Key do Firebase.
- `VITE_FIREBASE_AUTH_DOMAIN`: O domínio de autenticação do seu projeto Firebase.
- `VITE_FIREBASE_PROJECT_ID`: O ID do seu projeto Firebase.
- `VITE_FIREBASE_STORAGE_BUCKET`: O bucket de armazenamento do Firebase.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: O ID do remetente de mensagens do Firebase.
- `VITE_FIREBASE_APP_ID`: O ID do seu aplicativo Firebase.

## Gemini (IA)
- `VITE_GEMINI_API_KEY`: Sua chave de API do Google Gemini.

---
**Nota:** O prefixo `VITE_` é obrigatório para que o Vite exponha essas variáveis ao código frontend durante o build.
