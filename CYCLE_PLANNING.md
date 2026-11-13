# Prescrição: IA simples ou organização por ciclo

Após selecionar o atleta, o administrador pode alternar entre **Gerar com IA** e **Organizar por ciclo**. Os demais treinadores recebem a organização por ciclo; a geração de periodização por IA continua restrita ao administrador no frontend e no servidor.

## Gerar com IA

Objetivo, distância/modalidade, início e final/prova, dias de corrida e descrição livre para a IA. Fortalecimento e dia do longão ficam recolhidos em uma seção opcional. Nenhum dia de fortalecimento é acrescentado por padrão em prescrições novas.

Modelo, distribuição e etapas não são exigidos nem enviados neste modo, mesmo que haja escolhas parciais no outro formulário. A geração mantém revisão, rascunho local e publicação. O serviço segue aceitando organização explícita para compatibilidade, mas o formulário simples envia esse parâmetro ausente.

## Organizar por ciclo

O calendário e os dias são compartilhados entre os modos. O treinador define modelo, distribuição e foco. Etapas são opcionais: semana inicial, semana final e foco. Percentuais, volume alvo, observações detalhadas e conferência de intensidade ficam em **Mais opções e conferência do ciclo**, carregados somente quando abertos. Metadados avançados existentes são preservados pela edição simples.

**Criar ciclo e preencher treinos** monta a planilha nas datas e dias escolhidos, sem inventar quilômetros ou exercícios, com semanas ocultas. O foco de cada etapa aparece no calendário; prioridades exatamente iguais a Base, Construção, Pico ou Polimento também preenchem a fase. Os demais focos ficam nas notas, sem inferir uma fase pelo nome de uma capacidade.

O rascunho sobrevive à recarga no mesmo dispositivo. A publicação exige treinos preenchidos nas semanas liberadas; **Publicar semana** salva e libera a semana em uma ação. O ciclo anterior permanece até a publicação e é arquivado ao ser substituído. Não há nova tabela ou migração: a organização usa `AthletePlan.cyclePlanning` e as notas de semana existentes.

Alternar modos preserva campos sem salvar ou alterar sessões automaticamente. Gerar uma nova proposta simples de IA limpa os metadados de organização do novo rascunho. Ao trocar de atleta, os dados são restaurados do ciclo/rascunho correspondente. Datas inválidas, ausência de dias e limites de duração (24 semanas para IA e 52 por ciclo) são validados antes da criação.

## Conferência do planejamento

**Conferir volume e distribuição do planejamento** mostra quilômetros prescritos, minutos planejados, distribuição baixa/moderada/alta, tempos sem classificação, estimativas e pendências, no ciclo e por semana. O painel permite classificar os segmentos ou, para treinos contínuos sem estrutura, indicar a duração planejada e a faixa.

- Tempo estruturado em segundos é convertido em minutos.
- Distância com pace planejado permite estimar minutos pelo ponto médio do intervalo de pace; o painel identifica estimativas.
- Sem tempo ou pace suficiente, há pendência; distância não é convertida em tempo por chute.
- Aquecimento, recuperação ativa e desaquecimento são considerados por segmento. Pausa passiva explícita ou marcada pelo treinador é contada separadamente e excluída do tempo ativo.
- As faixas são atribuídas pelo treinador, conforme suas referências individuais. Não há tradução automática das cinco zonas de pace para três faixas fisiológicas e o tipo do treino não define sozinho a faixa.
- A proporção usa os minutos com duração informada, incluindo os minutos conhecidos ainda sem faixa no denominador. Com pendências, a distribuição é identificada como parcial. Não representa os treinos executados.
- Força e descanso ficam fora do tempo de corrida. Dados reais de GPS, PSE, duração e distância executadas não substituem os valores planejados.
- O número de dias com tipos de treino exigentes, incluindo longão, é uma indicação para conferir alternância e recuperação, não um limite universal.

Referência de contexto para os conceitos de distribuição, sem adoção de percentuais universais do estudo: Stöggl e Sperlich (2014), https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2014.00033/full .

## Validação

`node --import tsx --test tests/cyclePlanning.test.ts tests/cyclePlanningAI.test.ts tests/prescriptionDraft.test.ts tests/prescriptionIntelligence.test.ts tests/accessPolicy.test.ts`

Testes cobrem escolhas independentes, validação de blocos e percentuais, dados incompletos, inclusão de aquecimento/recuperação ativa/desaquecimento, exclusão de pausa passiva, uso somente de dados planejados, rascunho manual e persistência das escolhas na geração e na revisão. No teste de integração da geração, apenas o transporte da IA é simulado; o serviço e a inspeção da prescrição são reais.

Fluxo móvel em Chromium com a página de Prescrição real: escolha e edição de blocos; criação manual sem gravação no ciclo ativo; recarga preservando escolhas; troca de atleta sem herdar o modelo; geração visível somente ao administrador; salvamento da organização em um ciclo existente preservando os treinos e dados de execução; painel de minutos previstos. Autenticação/contexto e persistência de nuvem foram simulados, sem contas de teste em produção.


A validação móvel da simplificação usa a página e o serviço de geração reais, com contexto, transporte de IA e persistência simulados. Cobriu administrador gerando sem modelo/distribuição, escolhas parciais sem vazamento para a IA, treinador comum criando e publicando a primeira semana sem IA, recuperação do rascunho, foco das etapas no calendário, opções avançadas recolhidas e alternância de modos preservando campos. Sem contas ou dados de teste em produção.
