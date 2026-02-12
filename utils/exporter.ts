
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';

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
    const canvas = await html2canvas(element, {
      scale: 2, // Escala 2x para nitidez em telas retina
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      onclone: (clonedDoc: Document) => {
        const el = clonedDoc.getElementById(elementId);
        if (el) {
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          el.style.display = 'block';
          el.style.width = '1200px'; // Largura fixa para consistência da imagem
          el.style.height = 'auto';
        }
      }
    });

    // Converte canvas para JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Trigger download
    const link = document.createElement('a');
    link.download = `${filename.replace(/\.pdf$/, '')}.jpg`;
    link.href = dataUrl;
    link.click();
    
    return true;
  } catch (error) {
    console.error("Falha na exportação de imagem:", error);
    alert("Houve um problema na geração da imagem. Tente novamente.");
    return false;
  }
};
