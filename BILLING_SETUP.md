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
