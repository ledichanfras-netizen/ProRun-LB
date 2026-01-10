
import html2pdf from 'html2pdf.js';

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

  const options = {
    margin: 0,
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    pagebreak: { mode: ['css', 'legacy'], avoid: '.print-week-block' },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc: Document) => {
        const originalElement = document.getElementById(elementId);
        const clonedElement = clonedDoc.getElementById(elementId);

        if (originalElement && clonedElement) {
          // Garante que o conteúdo do portal seja totalmente renderizado antes da captura
          clonedElement.innerHTML = originalElement.innerHTML;

          // Prepara o elemento clonado para a captura
          clonedElement.style.position = 'relative';
          clonedElement.style.left = '0';
          clonedElement.style.top = '0';
          clonedElement.style.visibility = 'visible';
          clonedElement.style.display = 'block';
          clonedElement.style.width = '297mm';
          clonedElement.style.height = 'auto';
          clonedElement.style.padding = '20px'; // Adiciona margem interna
          clonedDoc.body.innerHTML = clonedElement.outerHTML; // Substitui o corpo do documento pelo portal
        }
      }
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'landscape',
      compress: true,
      precision: 2
    }
  };

  try {
    // Inicia o worker do html2pdf
    await html2pdf().set(options).from(element).save();
    return true;
  } catch (error) {
    console.error("Erro crítico na geração do PDF:", error);
    // Fallback para o usuário caso o browser bloqueie o canvas
    alert("O sistema detectou uma instabilidade na geração do arquivo. Tentaremos abrir o modo de impressão do navegador como alternativa.");
    window.print();
    return false;
  }
};
