import html2canvas from 'html2canvas';
import { toJpeg } from 'html-to-image';

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
        allowTaint: true,
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
