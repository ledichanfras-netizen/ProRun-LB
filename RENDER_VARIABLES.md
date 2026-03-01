# Configuração do Render (Sincronização em Nuvem)

Para que o ProRun LB salve os dados na nuvem e permita o acesso de outros dispositivos e atletas, configure as seguintes **Variáveis de Ambiente** no seu painel do **Render**:

### 1. Variáveis do Firebase (Banco de Dados)
Obtenha estes valores no [Console do Firebase](https://console.firebase.google.com/) > Configurações do Projeto:

| Chave (Key) | Valor (Value) |
| :--- | :--- |
| `VITE_API_KEY` | (Sua Chave de API da Web) |
| `VITE_PROJECT_ID` | (Seu ID do Projeto) |
| `VITE_AUTH_DOMAIN` | (Geralmente `id-do-projeto.firebaseapp.com`) |
| `VITE_STORAGE_BUCKET` | (Geralmente `id-do-projeto.appspot.com`) |
| `VITE_MESSAGING_SENDER_ID` | (Seu ID de Remetente) |
| `VITE_APP_ID` | (Seu App ID) |

### 2. Variável da IA (Gerador de Treinos)
Obtenha em [AI Studio Google](https://aistudio.google.com/):

| Chave (Key) | Valor (Value) |
| :--- | :--- |
| `VITE_GEMINI_API_KEY` | (Sua Chave de API do Gemini) |

---
**Importante:** Após adicionar estas variáveis no Render, o serviço será reiniciado e a sincronização começará a funcionar automaticamente.
