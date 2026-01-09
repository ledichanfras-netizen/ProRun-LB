
import html2pdfModule from 'html2pdf';

/**
 * Exporta um elemento HTML para PDF e inicia o download automaticamente.
 * @param elementId ID do elemento a ser capturado
 * @param filename Nome do arquivo a ser salvo
 */
export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  
  if (!element) {
    console.error("ERRO: Elemento alvo não encontrado no DOM.");
    return false;
  }

  // Sincronização: Aguarda o React montar o conteúdo no Portal
  let attempts = 0;
  const minContentLength = 1200; // Um relatório completo tem pelo menos esse tamanho de HTML
  while ((!element.innerHTML || element.innerHTML.trim().length < minContentLength) && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  if (!element.innerHTML.trim() || element.innerHTML.trim().length < minContentLength) {
    console.warn("AVISO: Conteúdo do portal parece incompleto. Tentando exportar assim mesmo...");
  }

  let html2pdf: any = html2pdfModule;
  if (html2pdf && typeof html2pdf !== 'function' && html2pdf.default) {
    html2pdf = html2pdf.default;
  }
  if (typeof html2pdf !== 'function') {
    html2pdf = (window as any).html2pdf;
  }

  if (typeof html2pdf !== 'function') {
    console.error("ERRO: Função html2pdf não encontrada.");
    window.print();
    return false;
  }

  // Forçamos o scroll para o topo para evitar que o html2canvas capture a área errada
  window.scrollTo(0, 0);

  const options = {
    margin: [0, 0, 0, 0], // Margens tratadas internamente pelo layout
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    pagebreak: { mode: ['css', 'legacy'], avoid: '.print-week-block' },
    html2canvas: { 
      scale: 2, // Resolução 2x para nitidez de texto
      useCORS: true, 
      logging: false,
      backgroundColor: '#ffffff',
      letterRendering: true,
      allowTaint: true,
      onclone: (clonedDoc: Document) => {
        const el = clonedDoc.getElementById(elementId);
        if (el) {
          // No documento clonado para captura, tornamos o portal totalmente visível e posicionado
          el.style.position = 'static';
          el.style.left = '0';
          el.style.top = '0';
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          el.style.display = 'block';
          el.style.width = '297mm';
          
          // Remove animações para evitar borrões na captura
          const animatedElements = el.querySelectorAll('.animate-fade-in, .animate-fade-in-up');
          animatedElements.forEach((node: any) => {
            node.style.animation = 'none';
            node.style.opacity = '1';
            node.style.transform = 'none';
          });
        }
      }
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'landscape',
      compress: true
    }
  };

  try {
    // Geração do PDF
    const worker = html2pdf().set(options).from(element);
    await worker.save();
    return true;
  } catch (error) {
    console.error("Erro crítico na geração do PDF:", error);
    alert("Erro ao processar o PDF. Abrindo painel de impressão como alternativa.");
    window.print();
    return false;
  }
};
