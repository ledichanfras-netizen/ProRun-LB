# Organização da periodização

Na Prescrição, depois de selecionar o atleta, a seção **Organização da periodização** permite escolher de forma independente:

- Modelo: linear, ondulatório, em blocos ou personalizado.
- Distribuição do tempo de corrida: polarizada, piramidal, foco no limiar ou personalizada.
- Orientações, blocos com semanas inicial/final, prioridade, volume alvo do bloco e observações.
- Percentuais desejados opcionais, escolhidos pelo treinador e com soma de 100%; não há preset 80/20 automático.

Dados guardados em `AthletePlan.cyclePlanning` pelo salvamento de planos existente. Não há nova tabela ou migração. Ciclos antigos continuam sem modelo definido até uma escolha explícita. **Salvar organização do ciclo** salva somente essa organização sobre o ciclo atual, sem publicar semanas ou alterar os treinos. Durante edição dos treinos e em rascunhos novos, a organização acompanha a publicação do conjunto.

A proposta por IA recebe as escolhas, as prioridades dos blocos e o alvo opcional no prompt. A resposta e sua revisão preservam as escolhas do treinador. A montagem manual está disponível para treinadores comuns; geração de periodização e força por IA continua restrita ao administrador, pelo controle anterior de frontend e servidor.

Novos ciclos manuais começam como rascunhos locais com semanas ocultas e sem distâncias ou exercícios preenchidos automaticamente. O rascunho e a organização sobrevivem à navegação/reabertura no mesmo dispositivo. O ciclo ativo permanece até a publicação. Ao publicar um novo rascunho manual sobre um ciclo existente, o anterior é arquivado. Os rascunhos de importação do aluno são preservados. Treinos vazios das semanas selecionadas precisam ser preenchidos antes da publicação.

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
