# Configuração de Sincronização em Nuvem (Render + Firebase)

Para que o ProRun LB funcione em múltiplos dispositivos e salve dados na nuvem, siga este guia para configurar as Variáveis de Ambiente no painel do Render.

## 1. Onde encontrar seus valores reais

### Firebase (Banco de Dados)
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Vá em **Configurações do Projeto** (ícone de engrenagem).
3. Na aba **Geral**, role até "Seus Aplicativos" e copie os valores do objeto `firebaseConfig`.

### Gemini (IA)
1. Acesse o [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Crie ou copie sua API Key.

## 2. O que inserir no Render
No Dashboard do Render, vá em **Environment** > **Add Environment Variable**:

| Key | Valor Sugerido |
| :--- | :--- |
| `VITE_API_KEY` | (Sua apiKey do Firebase) |
| `VITE_PROJECT_ID` | (Seu projectId do Firebase) |
| `VITE_AUTH_DOMAIN` | (Seu authDomain do Firebase) |
| `VITE_STORAGE_BUCKET` | (Seu storageBucket do Firebase) |
| `VITE_MESSAGING_SENDER_ID` | (Seu messagingSenderId do Firebase) |
| `VITE_APP_ID` | (Seu appId do Firebase) |
| `VITE_GEMINI_API_KEY` | (Sua API Key do Gemini) |

---
**Nota:** Após salvar no Render, o sistema reiniciará. O ícone de Nuvem na barra lateral do app ficará **verde**, indicando que a sincronização global está ativa.
