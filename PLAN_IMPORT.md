# Importação de planilhas no ProRun LB

Na prescrição, selecione o aluno e abra **Importar planilha com IA**. Envie até quatro JPGs, PNGs, WebPs ou PDFs (6 MB após a preparação das imagens). Confira a descrição, datas, quantidades e blocos. Campos ausentes ficam vazios e dúvidas são destacadas.

- **Salvar rascunho** mantém a programação atual. Até quatro rascunhos por aluno ficam no `plan_data.importDrafts` existente, sem tabela nova.
- **Adicionar ao ciclo** exige confirmação de revisão, datas válidas e ausência de conflitos. Adiciona semanas ocultas; o treinador publica cada semana depois. Uma data já programada não é sobrescrita, mesmo se estiver oculta ou for descanso.
- Datas sem ano explícito não são inferidas pela IA. O treinador pode informar a segunda-feira inicial para preencher os dias identificados ou editar cada data.
- Para substituir um ciclo inteiro, salve o rascunho, feche a importação, arquive o ciclo pelo fluxo existente e reabra o rascunho. Arquivar preserva esses rascunhos e corridas livres.
- A descrição original e os blocos são revisáveis separadamente. Blocos ambíguos podem ser removidos, mantendo o texto. Distância/tempo totais não são estimados quando ausentes. A fase Base é o padrão do aplicativo para novas semanas: confira a fase no editor antes de publicar.
- Esta primeira versão não lê Excel. Exporte a planilha para PDF ou envie prints.

O endpoint `/api/ai/transcribe` verifica a sessão, conta ativa de treinador e acesso ao aluno com o JWT e RLS existentes. Usa um prompt e um formato de saída fixos. Não aceita instruções livres, modelos ou schemas enviados pelo navegador. A geração de periodização e força continua exclusiva do administrador no endpoint original.

A leitura usa a chave Gemini já configurada no servidor e os modelos com alternativa existentes. O limite é de 10 leituras/hora por treinador no processo do servidor. Arquivos são enviados inline para o provedor de IA durante a leitura; o aplicativo não persiste os arquivos originais em Storage ou no banco. Apenas o texto revisável, nomes dos arquivos e metadados do rascunho ficam salvos. A leitura consome a cota/cobrança da API configurada.

`prorun_import_write` é uma função SECURITY INVOKER restrita a treinadores autenticados. Compara e grava o snapshot em uma operação no Postgres, mantendo RLS e evitando que uma importação sobrescreva publicação ou execução concorrente. O JSON é enviado no corpo da chamada RPC, evitando URLs grandes. Ao acrescentar uma planilha externa revisada, uma revisão de IA anterior fica preservada em `priorPrescriptionReview`, sem tratar a transcrição manual como uma nova proposta gerada pela IA.

## Verificação

- `node --import tsx --test tests/planTranscription.test.ts tests/planTranscriptionApi.test.ts tests/accessPolicy.test.ts tests/portalSchedule.test.ts`
- `npm run lint` e `npm run build`.
- Fluxo móvel em Chromium com o componente real, transporte HTTP, parser e validação reais; somente autenticação/nuvem e a resposta do provedor de IA foram simuladas. PDF → prévia → datas → editar → salvar → fechar/reabrir → adicionar semana oculta; ações visíveis em 390 × 844.
- Função no Postgres verificada com contexto autenticado de treinador: comparação válida aceita; snapshot antigo recusado; usuário desconhecido negado. Escritas de verificação revertidas em transação.
- Advisory de segurança sem novos alertas relacionados à função. Aviso anterior de proteção contra senhas vazadas desativada continua fora deste escopo: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

A exatidão da leitura de documentos reais depende da legibilidade e da resposta da IA; a revisão do treinador é obrigatória. Não houve leitura de planilhas reais de alunos nem criação de contas de teste em produção.
