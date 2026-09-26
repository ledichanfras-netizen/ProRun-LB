import html2canvas from 'html2canvas';
import { toJpeg, toPng, toBlob } from 'html-to-image';

export interface ExportImageOptions {
  format?: 'png' | 'jpeg';
  transparent?: boolean;
  scale?: number;
}

/**
 * Exporta um elemento HTML para Imagem PNG/JPEG de Alta Definição com suporte a transparência.
 */
export const exportElementAsImage = async (
  elementId: string, 
  filename: string,
  options: ExportImageOptions = {}
): Promise<{ success: boolean; dataUrl?: string; blob?: Blob }> => {
  const { format = 'png', transparent = false, scale = 2 } = options;
  let element = document.getElementById(elementId);
  
  if (!element) {
    console.error(`ERRO: Elemento '${elementId}' não encontrado.`);
    return { success: false };
  }

  // Pré-carrega todas as imagens
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(img => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 600);
      });
    })
  );

  await new Promise(resolve => setTimeout(resolve, 150));

  const cleanFilename = filename.replace(/\.[^/.]+$/, '').replace(/[^\w\s-]/gi, '_');
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';

  const triggerDownload = (dataUrl: string) => {
    const link = document.createElement('a');
    link.download = `${cleanFilename}.${ext}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dataURLToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Find all hidden ancestors and temporarily unhide them off-screen
  const hiddenAncestors: { 
    element: HTMLElement; 
    originalDisplay: string; 
    originalVisibility: string; 
    originalPosition: string; 
    originalLeft: string;
    originalTop: string;
  }[] = [];
  
  let curr: HTMLElement | null = element;
  let topHidden: HTMLElement | null = null;
  
  while (curr && curr !== document.body) {
    const style = window.getComputedStyle(curr);
    if (style.display === 'none' || curr.classList.contains('hidden') || style.visibility === 'hidden') {
      hiddenAncestors.push({
        element: curr,
        originalDisplay: curr.style.display,
        originalVisibility: curr.style.visibility,
        originalPosition: curr.style.position,
        originalLeft: curr.style.left,
        originalTop: curr.style.top
      });
      topHidden = curr;
    }
    curr = curr.parentElement;
  }

  // If there are hidden ancestors, force them visible off-screen so we can export
  if (hiddenAncestors.length > 0) {
    hiddenAncestors.forEach(({ element: el }) => {
      el.style.setProperty('display', 'flex', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
    });
    if (topHidden) {
      topHidden.style.setProperty('position', 'fixed', 'important');
      topHidden.style.setProperty('left', '-9999px', 'important');
      topHidden.style.setProperty('top', '0', 'important');
    }
  }

  try {
    // 1. Tenta html2canvas
    try {
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: false, // DO NOT allow taint, prevents security error during canvas export
        backgroundColor: transparent ? null : '#ffffff',
        logging: false,
      });

      const dataUrl = canvas.toDataURL(mimeType, 0.98);
      if (dataUrl && dataUrl.length > 500) {
        triggerDownload(dataUrl);
        const blob = dataURLToBlob(dataUrl);
        return { success: true, dataUrl, blob };
      }
    } catch (h2cError) {
      console.warn("html2canvas falhou, tentando toPng/toJpeg...", h2cError);
    }

    // 2. Fallback html-to-image
    const dataUrl = format === 'png'
      ? await toPng(element, { pixelRatio: scale, backgroundColor: transparent ? 'transparent' : '#ffffff', skipFonts: true })
      : await toJpeg(element, { quality: 0.98, pixelRatio: scale, backgroundColor: '#ffffff', skipFonts: true });

    if (dataUrl && dataUrl.length > 500) {
      triggerDownload(dataUrl);
      const blob = dataURLToBlob(dataUrl);
      return { success: true, dataUrl, blob };
    }

    throw new Error("Falha na renderização de imagem");
  } catch (err: any) {
    console.error("Erro ao exportar imagem:", err);
    return { success: false };
  } finally {
    // Restaura os estilos originais perfeitamente
    hiddenAncestors.forEach(({ element: el, originalDisplay, originalVisibility, originalPosition, originalLeft, originalTop }) => {
      el.style.display = originalDisplay;
      el.style.visibility = originalVisibility;
      el.style.position = originalPosition;
      el.style.left = originalLeft;
      el.style.top = originalTop;
    });
  }
};

/**
 * Converte um base64/DataURL em um objeto File nativo.
 */
const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

/**
 * Exibe um modal elegante e amigável em dispositivos móveis
 * para que o atleta possa salvar ou compartilhar manualmente o treino.
 */
const showMobileSaveModal = (dataUrl: string, filename: string) => {
  // Remove qualquer modal existente de mesma ID
  const existingModal = document.getElementById('mobile-save-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Injeta estilos css temporários para animação suave
  const styleId = 'mobile-save-modal-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes modalBgFadeIn {
        from { opacity: 0; backdrop-filter: blur(0px); }
        to { opacity: 1; backdrop-filter: blur(12px); }
      }
      @keyframes modalContentScaleUp {
        from { opacity: 0; transform: scale(0.92); }
        to { opacity: 1; transform: scale(1); }
      }
      .mobile-modal-bg {
        animation: modalBgFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .mobile-modal-content {
        animation: modalContentScaleUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
    `;
    document.head.appendChild(style);
  }

  // Container principal do modal
  const modal = document.createElement('div');
  modal.id = 'mobile-save-modal';
  modal.className = 'fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/85 p-4 md:p-6 mobile-modal-bg text-white font-sans';

  // Caixa de Conteúdo
  const contentBox = document.createElement('div');
  contentBox.className = 'relative max-w-md w-full bg-[#050810] rounded-[2.5rem] border border-white/10 p-6 flex flex-col items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mobile-modal-content';

  // Botão Fechar
  const closeButton = document.createElement('button');
  closeButton.className = 'absolute top-5 right-5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/5';
  closeButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;
  closeButton.onclick = () => {
    modal.remove();
  };

  // Cabeçalho do modal
  const header = document.createElement('div');
  header.className = 'text-center mt-2 w-full';
  header.innerHTML = `
    <h3 class="text-base font-black italic uppercase tracking-tight text-white flex items-center justify-center gap-2">
      Planilha Gerada!
    </h3>
    <p class="text-[10px] font-black text-emerald-400 mt-1 uppercase tracking-[0.15em]">
      Toque e segure para Salvar ou Compartilhar
    </p>
  `;

  // Wrapper e Imagem em si
  const imgWrapper = document.createElement('div');
  imgWrapper.className = 'w-full max-h-[50vh] overflow-y-auto rounded-[1.5rem] border border-white/5 bg-black/50 p-1.5 flex justify-center custom-scrollbar';

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'Planilha de Treino';
  img.className = 'max-w-full h-auto object-contain rounded-xl shadow-md';
  imgWrapper.appendChild(img);

  // Texto explicativo de ajuda
  const footerText = document.createElement('p');
  footerText.className = 'text-[10px] text-slate-400 font-medium text-center leading-relaxed px-1';
  footerText.innerHTML = `
    Se o download automático foi bloqueado, <strong>mantenha o dedo pressionado (toque e segure)</strong> sobre a imagem acima e selecione <strong>"Salvar em Fotos"</strong>, <strong>"Adicionar a Fotos"</strong> ou <strong>"Compartilhar"</strong>.
  `;

  // Botões de ação
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'w-full flex flex-col gap-2 mt-2';

  // Botão de compartilhamento nativo do celular
  if (navigator.share && typeof navigator.canShare === 'function') {
    const shareBtn = document.createElement('button');
    shareBtn.className = 'w-full py-4 bg-emerald-500 hover:bg-emerald-600 rounded-[1.25rem] font-black text-xs uppercase italic tracking-widest text-white shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 border border-emerald-400/20';
    shareBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.684 10.742l4.636-2.318a2.5 2.5 0 11.758 1.518l-4.636 2.318a2.5 2.5 0 11-.758-1.518zm0 4.516l4.636 2.318a2.5 2.5 0 11-.758 1.518l-4.636-2.318a2.5 2.5 0 11.758-1.518z" />
      </svg>
      Compartilhar Planilha
    `;
    shareBtn.onclick = async () => {
      try {
        const file = dataURLtoFile(dataUrl, filename);
        await navigator.share({
          files: [file],
          title: 'Planilha de Treino ProRun LB',
          text: 'Confira minha planilha de treino ProRun LB!',
        });
      } catch (err) {
        console.warn("[Save Modal] Compartilhamento nativo cancelado ou falhou", err);
      }
    };
    buttonsContainer.appendChild(shareBtn);
  }

  // Botão de download convencional (fallback do fallback)
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'w-full py-3.5 bg-white/5 hover:bg-white/10 rounded-[1.25rem] border border-white/10 font-black text-xs uppercase italic tracking-widest text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2';
  downloadBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
    Tentar Baixar Diretamente
  `;
  downloadBtn.onclick = () => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  buttonsContainer.appendChild(downloadBtn);

  // Montagem do DOM
  contentBox.appendChild(closeButton);
  contentBox.appendChild(header);
  contentBox.appendChild(imgWrapper);
  contentBox.appendChild(footerText);
  contentBox.appendChild(buttonsContainer);
  modal.appendChild(contentBox);

  document.body.appendChild(modal);
};

/**
 * Exporta um elemento HTML para Imagem JPEG de Alta Definição.
 * Suporta elementos normais e portais ocultos fora da tela (#printable-portal).
 * Otimizado com Web Share API e modal de toque e segure para perfeito funcionamento no celular.
 */
export const exportToImage = async (elementId: string, filename: string): Promise<boolean> => {
  let element = document.getElementById(elementId);
  
  if (!element) {
    console.error(`ERRO: Elemento '${elementId}' não encontrado no DOM.`);
    alert("Elemento de treino para geração de imagem não foi localizado no sistema.");
    return false;
  }

  // Sincronização: Aguarda renderização do conteúdo (especialmente em portais React)
  let attempts = 0;
  while ((!element.innerHTML || element.innerHTML.trim().length < 100) && attempts < 40) {
    await new Promise(resolve => setTimeout(resolve, 100));
    element = document.getElementById(elementId) || element;
    attempts++;
  }

  if (!element || !element.innerHTML || element.innerHTML.trim().length < 50) {
    console.error("ERRO: Elemento com conteúdo insuficiente para exportar.");
    alert("Conteúdo do treino ainda está sendo preparado. Tente novamente.");
    return false;
  }

  // Identifica o portal pai (#printable-portal) se existir
  const portalParent = document.getElementById('printable-portal');

  // Armazena estilos originais para restauração
  const originalPortalStyle = portalParent ? {
    position: portalParent.style.position,
    left: portalParent.style.left,
    top: portalParent.style.top,
    zIndex: portalParent.style.zIndex,
    visibility: portalParent.style.visibility,
    opacity: portalParent.style.opacity,
    display: portalParent.style.display,
    pointerEvents: portalParent.style.pointerEvents,
  } : null;

  const originalElementStyle = {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    visibility: element.style.visibility,
    opacity: element.style.opacity,
    display: element.style.display,
    width: element.style.width,
  };

  try {
    // 1. Posiciona temporariamente o elemento e seu portal dentro do viewport visível (top-left)
    // para garantir coordenadas positivas e tamanho correto em html2canvas/html-to-image
    if (portalParent) {
      portalParent.style.position = 'fixed';
      portalParent.style.left = '0';
      portalParent.style.top = '0';
      portalParent.style.zIndex = '99999';
      portalParent.style.visibility = 'visible';
      portalParent.style.opacity = '1';
      portalParent.style.display = 'block';
      portalParent.style.pointerEvents = 'none';
    }

    element.style.visibility = 'visible';
    element.style.opacity = '1';
    element.style.display = 'block';

    // 2. Pré-carrega todas as imagens no elemento
    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(
      images.map(img => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          // Timeout de segurança para não travar
          setTimeout(resolve, 800);
        });
      })
    );

    // Aguarda um pequeno ciclo para a renderização do layout estabilizar
    await new Promise(resolve => setTimeout(resolve, 200));

    // Função interna de disparo de download ou compartilhamento nativo no celular
    const triggerDownload = async (dataUrl: string) => {
      const cleanFilename = filename.replace(/\.[^/.]+$/, '').replace(/[^\w\s-]/gi, '_');
      const filenameWithExt = `${cleanFilename}.jpg`;

      // Detecta se é dispositivo móvel (celular/tablet)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        // Tenta usar Web Share API primeiro se disponível e compatível com arquivos
        if (navigator.share && typeof navigator.canShare === 'function') {
          try {
            const file = dataURLtoFile(dataUrl, filenameWithExt);
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Planilha de Treino ProRun LB',
                text: 'Confira meu relatório de treino!',
              });
              return;
            }
          } catch (shareError) {
            console.warn("Falha ao compartilhar via Web Share API, abrindo modal de instruções...", shareError);
          }
        }

        // Caso não suporte compartilhamento direto ou falhe, abre o modal de salvamento manual
        showMobileSaveModal(dataUrl, filenameWithExt);
        return;
      }

      // No Desktop, mantém o download tradicional via link programático
      const link = document.createElement('a');
      link.download = filenameWithExt;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Método 1: html2canvas (Principal e mais confiável para renderização de HTML/CSS em canvas)
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Resolução HD (2x)
        useCORS: true,
        allowTaint: false, // Prevents security exceptions for canvas exports
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      if (dataUrl && dataUrl.length > 1000) {
        await triggerDownload(dataUrl);
        return true;
      }
    } catch (h2cError) {
      console.warn("html2canvas falhou, tentando método de fallback (toJpeg)...", h2cError);
    }

    // Método 2 (Fallback): html-to-image toJpeg com skipFonts para evitar erros de CORS de fontes externas
    const dataUrlFallback = await toJpeg(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: false,
      skipFonts: true, // Evita requisições CORS em fontes externas que causam erro na geração
      style: {
        visibility: 'visible',
        opacity: '1',
        display: 'block',
        margin: '0',
      },
    });

    if (dataUrlFallback && dataUrlFallback.length > 1000) {
      await triggerDownload(dataUrlFallback);
      return true;
    }

    throw new Error("Não foi possível converter o elemento em imagem válida.");

  } catch (error: any) {
    console.error("Falha na exportação de imagem do treino:", error?.message || error);
    alert("Ocorreu uma falha ao gerar a imagem do treino. Por favor, tente novamente.");
    return false;
  } finally {
    // Restaura imediatamente os estilos originais para esconder o portal do usuário
    if (portalParent && originalPortalStyle) {
      portalParent.style.position = originalPortalStyle.position;
      portalParent.style.left = originalPortalStyle.left;
      portalParent.style.top = originalPortalStyle.top;
      portalParent.style.zIndex = originalPortalStyle.zIndex;
      portalParent.style.visibility = originalPortalStyle.visibility;
      portalParent.style.opacity = originalPortalStyle.opacity;
      portalParent.style.display = originalPortalStyle.display;
      portalParent.style.pointerEvents = originalPortalStyle.pointerEvents;
    }

    if (element && originalElementStyle) {
      element.style.position = originalElementStyle.position;
      element.style.left = originalElementStyle.left;
      element.style.top = originalElementStyle.top;
      element.style.visibility = originalElementStyle.visibility;
      element.style.opacity = originalElementStyle.opacity;
      element.style.display = originalElementStyle.display;
      element.style.width = originalElementStyle.width;
    }
  }
};
