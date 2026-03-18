
import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';

/**
 * Exporta um elemento HTML para PDF com máxima fidelidade visual.
 * Usa html-to-image para renderização e jsPDF para geração do arquivo.
 */
export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  
  if (!element) {
    console.error("ERRO: Elemento alvo não encontrado no DOM.");
    return false;
  }

  // Sincronização: Aguarda renderização completa
  let attempts = 0;
  const minContentLength = 1000; 
  while ((!element.innerHTML || element.innerHTML.trim().length < minContentLength) && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  try {
    // 1. Gera imagem de alta qualidade do elemento
    const dataUrl = await toJpeg(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        visibility: 'visible',
        opacity: '1',
        display: 'block',
      },
      width: 1200,
      filter: (node: Node) => {
        if (node instanceof HTMLElement && node.tagName === 'LINK' && (node as HTMLLinkElement).rel === 'stylesheet') {
          try {
            const sheet = (node as HTMLLinkElement).sheet;
            if (sheet) { const _r = sheet.cssRules; }
          } catch (e) { return false; }
        }
        return true;
      }
    });

    // 2. Cria o PDF em modo paisagem (landscape) para acomodar a largura de 1200px
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // Se a altura da imagem for maior que a do PDF, ela será redimensionada proporcionalmente
    // Para relatórios longos, poderíamos adicionar múltiplas páginas, mas para este layout fixo de 1200px,
    // o ajuste proporcional é o ideal.
    pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    
    return true;
  } catch (error: any) {
    console.error("Falha na exportação PDF:", error?.message || "Erro desconhecido");
    alert("Houve um problema na geração do PDF. Tente novamente ou use a opção de baixar imagem.");
    return false;
  }
};
