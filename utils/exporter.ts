
import { toJpeg } from 'html-to-image';

/**
 * Exporta um elemento HTML para Imagem JPEG com alta fidelidade.
 * Ideal para compartilhamento em redes sociais e visualização mobile.
 */
export const exportToImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  
  if (!element) {
    console.error("ERRO: Elemento alvo não encontrado no DOM.");
    return false;
  }

  // Sincronização: Aguarda renderização completa
  let attempts = 0;
  while ((!element.innerHTML || element.innerHTML.trim().length < 500) && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  try {
    // html-to-image é mais compatível com CSS moderno (oklch, grid, etc)
    // cacheBust ajuda a evitar problemas de CORS com fontes cacheadas
    const dataUrl = await toJpeg(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        visibility: 'visible',
        opacity: '1',
        display: 'block',
        margin: '0',
      },
      width: 1200,
      skipFonts: false, // Garante que tentamos carregar as fontes
      filter: (node: Node) => {
        // Se for um link de CSS, verifica se temos acesso às regras (CORS)
        if (node instanceof HTMLElement && node.tagName === 'LINK' && (node as HTMLLinkElement).rel === 'stylesheet') {
          try {
            const sheet = (node as HTMLLinkElement).sheet;
            if (sheet) {
              // Tentar acessar cssRules dispara o erro de CORS se houver problema
              const _rules = sheet.cssRules;
            }
          } catch (e) {
            console.warn("Pulando folha de estilo externa devido a restrições de CORS:", (node as HTMLLinkElement).href);
            return false;
          }
        }
        return true;
      }
    });
    
    // Trigger download
    const link = document.createElement('a');
    link.download = `${filename.replace(/\.pdf$/, '')}.jpg`;
    link.href = dataUrl;
    link.click();
    
    return true;
  } catch (error: any) {
    console.error("Falha na exportação de imagem:", error?.message || "Erro desconhecido");
    alert("Houve um problema na geração da imagem. Tente novamente.");
    return false;
  }
};
