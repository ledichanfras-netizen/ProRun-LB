# Mensalidades ProRun LB

O menu **Mensalidades** substitui os antigos planos ilustrativos. Nenhum valor ou bloqueio é atribuído automaticamente aos usuários existentes.

## Uso

1. Treinador: cadastrar mensalidade do aluno, valor total, duração e primeiro vencimento. O administrador também pode cadastrar mensalidades de treinadores.
2. O controle de acesso é opcional por pessoa. Quando ativado, exige período pago, cortesia válida ou tolerância após período pago. O acesso ao pagamento e a saída da conta permanecem disponíveis.
3. Pagamento por fora: registrar recebimento integral, forma, data e observação. Uma correção manual mantém o evento no histórico e recalcula o acesso.
4. Cobranças emitidas preservam seus valores e datas. Para corrigir uma cobrança sem checkout/pagamento, cancelar, editar o plano e gerar outra.
5. Cada cobrança cobre as datas exibidas, inclusive o último dia. Cobranças pagas permitem baixar recibo PDF. Uma próxima cobrança é gerada a pedido do treinador ou quando o pagante consulta sua mensalidade nos sete dias finais do período.

## Mercado Pago

O administrador configura **App ID**, **Client Secret** e assinatura secreta de Webhooks na aplicação, em Mensalidades → Configurar integração. Esses valores são enviados por HTTPS ao backend e nunca devolvidos aos clientes. Não colocar credenciais em código nem em mensagens.

Na aplicação do Mercado Pago, configurar OAuth Authorization Code com PKCE e cadastrar a URL de retorno exibida no módulo, exatamente. Configurar Webhooks para eventos de pagamentos com a URL exibida. Cada treinador, inclusive o administrador, usa **Conectar Mercado Pago** e autoriza sua própria conta. Não há split, comissão automática ou saldo sob custódia do ProRun LB.

Checkout Pro via Preferences cria o link por cobrança; o pagante escolhe entre os meios disponibilizados pelo Mercado Pago. Não é uma assinatura com débito recorrente de cartão. O acesso só muda após consulta autenticada à API do provedor com confirmação de recebedor, referência, BRL, valor integral e ambiente real. Retorno de checkout não comprova pagamento. Estornos e contestações revogam a validade do recebimento. Repetições/atrasos de Webhooks não duplicam ou reativam um pagamento estornado. Mais de um pagamento aprovado gera aviso para conferência pelo recebedor.

## Banco e implantação

- Migration: `supabase/migrations/20261109012835_prorun_billing.sql`.
- Edge `prorun-billing`: JWT de gateway desativado porque recebe callbacks públicos; ações do aplicativo validam `auth.getUser`, conta ativa e autorização por organização. OAuth usa estado aleatório de uso único e PKCE; Webhooks exigem HMAC e consulta autenticada do pagamento.
- Atualizar também `prorun-access`, que consulta o direito de acesso antes de ações de gestão. Login, atualização de senha e consulta do próprio perfil continuam disponíveis para renovação.
- RLS restringe atletas, planos, biblioteca e relatórios de ciclo quando a mensalidade exigida expira. Uma assinatura do treinador não altera a assinatura dos alunos dele.
- Tabelas financeiras, tokens e configuração: sem permissões para `anon`/`authenticated`; somente o backend autenticado com service role. Políticas de organização anteriores continuam válidas.
- Verificação SQL: executar `supabase/tests/prorun_billing.sql` dentro de `begin`/`rollback`. Os dados de verificação nunca devem ser confirmados.
- Testes de calendário, confirmação, valores, HMAC e liberação: `node --import tsx --test tests/billing.test.ts`.

A integração real só pode ser homologada depois da configuração e autorização da conta Mercado Pago. A publicação do módulo não realiza débitos, pagamentos, reembolsos ou bloqueios individuais por conta própria.

## Avisos e contratos com parcelas

- Card no painel e sino: avisos aos responsáveis e pagantes nos marcos de 7, 3 e 1 dia, no vencimento, em atraso e após a tolerância. Cada etapa mantém um único registro por pessoa/plano/data; abrir o aplicativo novamente não gera duplicatas. Etapas superadas e pagamentos confirmados deixam de aparecer como pendência.
- Avisos são internos ao aplicativo, persistidos por usuário, com leitura/exclusão sincronizada. Não há envio automático de WhatsApp, e-mail ou push do sistema operacional. O botão de WhatsApp abre a conversa/mensagem para revisão e envio pelo treinador; se não houver telefone válido, permite escolher o contato.
- Uma rotina diária gera os avisos às 12h UTC (9h em Brasília). A abertura, retorno ao aplicativo e atualização do módulo também recalculam as pendências. O trabalho diário usa somente o banco, sem serviços pagos nem chaves externas.
- Duração e pagamento são distintos: mensal, trimestral, semestral e anual podem ser integrais ou divididos em parcelas mensais; por periodização usa datas fixas, com nome opcional e cópia explícita das datas do plano de treino.
- O valor informado é o total do contrato. O parcelamento distribui centavos e preserva o total; cada cobrança mostra número da parcela e seu período de acesso. Pagar uma parcela não libera os outros períodos. Pagamentos integrais liberam todas as datas daquela cobrança.
- Parcelas emitidas não são reescritas. Novo período cria uma nova contratação após os períodos financeiros existentes, preservando histórico, recibos e cobranças anteriores. Editar treinos ou arquivar um ciclo não altera datas financeiras.
- A migration nova é `20261109021934_prorun_billing_reminders_terms.sql`. Verificar `supabase/tests/prorun_billing_reminders.sql` em transação com rollback; não criar contas de teste persistentes em produção.
