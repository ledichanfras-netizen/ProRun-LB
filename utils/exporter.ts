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
 * Exporta um elemento HTML para Imagem JPEG de Alta Definição.
 * Suporta elementos normais e portais ocultos fora da tela (#printable-portal).
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

    // Função interna de disparo de download
    const triggerDownload = (dataUrl: string) => {
      const cleanFilename = filename.replace(/\.[^/.]+$/, '').replace(/[^\w\s-]/gi, '_');
      const link = document.createElement('a');
      link.download = `${cleanFilename}.jpg`;
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
        triggerDownload(dataUrl);
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
      triggerDownload(dataUrlFallback);
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
