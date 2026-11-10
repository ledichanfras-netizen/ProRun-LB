# Vídeo local do percurso

Em **Postar Treino → Criar vídeo do percurso**, o atleta pode visualizar, gravar, baixar e compartilhar uma animação vertical 720 × 1280 com 10, 12 (padrão) ou 15 segundos.

- Usa somente a geometria GPS salva; um percurso ausente, inválido ou sem deslocamento não é substituído por circuito de demonstração ou posição atual.
- Introdução de um segundo, reprodução acelerada por distância ao longo da geometria e encerramento de dois segundos com os totais registrados. Não fabrica pace instantâneo, tempo, FC ou dados de quilômetros ausentes.
- Respeita título, identificação, estilo de mapa, cor de rota, logo e seleção de marcadores de quilômetros da postagem. O enquadramento do vídeo mostra o percurso inteiro. A edição e exportação PNG anteriores continuam disponíveis.
- As imagens do mapa são carregadas uma vez antes da gravação, com CORS. Se não carregarem por completo, o vídeo usa fundo limpo com o percurso real e informa a alternativa; não usa proxy, conversão ou armazenamento de vídeos no servidor.
- Prefere gravação nativa MP4/H.264 quando o navegador declara suporte. WebM é alternativa identificada com extensão correta e aviso de compatibilidade para aplicativos que exigem MP4. Navegadores sem gravação continuam com PNG e prévia de percurso.
- A prévia gravada e os botões de download/compartilhar aparecem após a finalização real do arquivo. O compartilhamento ocorre em um novo clique do usuário para preservar a autorização nativa do navegador; cancelar não é tratado como envio bem-sucedido.
- Durante a geração o app deve permanecer visível. Sair da tela, cancelar ou fechar a janela interrompe a tarefa e libera as trilhas de captura. O arquivo em memória é descartado ao fechar ou gerar outro. Sem áudio nem permissão de microfone.
- Os vídeos são temporários em memória e só vão para Arquivos/Downloads ou para o app escolhido pelo usuário. Nenhuma alteração de esquema, função de banco, API de upload, serviço de IA ou processamento remoto foi adicionada.

## Verificação

`node --import tsx --test tests/routeVideo.test.ts tests/recordRouteVideo.test.ts tests/shareMapMetrics.test.ts tests/socialMap.test.ts`

`npm run lint` e `npm run build`.

QA em Chromium isolado: MP4 H.264 Baseline 720 × 1280 de aproximadamente 12 segundos; alternativa WebM; cancelamento; geração e download na interface de 390 × 844; fundo limpo após falha do mapa e carregamento CORS. Arquivos de QA são temporários e não usam trajetos ou contas reais. Compatibilidade com o aplicativo de postagem e o navegador do aparelho continua dependendo dos formatos que eles aceitam.

### Correção de inicialização em celulares

A solicitação e a liberação do bloqueio de tela são opcionais e não bloqueiam a gravação, o cancelamento nem a entrega do arquivo. Se um aparelho anuncia suporte a MP4 mas falha ao criar/iniciar o gravador, o aplicativo tenta os demais formatos suportados e mostra o formato efetivamente gerado. Ações, erros e progresso ficam em uma área fixa da janela; a prévia rola separadamente. Testes de regressão cobrem APIs opcionais sem resposta, cancelamento e suporte MP4 anunciado incorretamente.

### Janela de vídeo sobre a postagem

A postagem usa uma camada própria de tela inteira. A janela do vídeo e o aviso de carregamento agora aparecem acima dessa camada, para que o usuário veja e possa acionar a geração. Validado em fluxo integrado: abrir WorkoutShareModal, abrir vídeo, gerar MP4 720 × 1280, reproduzir e voltar à postagem sem fechá-la.

## Perspectiva imersiva

No gerador, “Ângulo do vídeo” alterna entre a vista superior existente e uma câmera inclinada com rotação, aproximação e acompanhamento suaves. O início e o final mostram o percurso completo. O fundo pode ser ruas, satélite ou fundo limpo. A perspectiva é aplicada ao canvas exportado; o arquivo baixado contém o mesmo efeito da prévia. Não há relevo, edifícios ou imagens de rua em 3D.

O mapa e a linha GPS compartilham uma única superfície projetada; os marcadores usam a mesma transformação e mantêm os textos legíveis. Trocar somente o ângulo reutiliza as imagens já carregadas. As opções ficam bloqueadas durante a gravação; alterar o ângulo ou o fundo descarta o arquivo anterior para evitar compartilhar uma versão desatualizada. A câmera depende apenas do progresso, mantendo a animação reproduzível em tentativas alternativas de codec. Não adiciona chamadas ao banco, uploads, bibliotecas ou serviços pagos.
