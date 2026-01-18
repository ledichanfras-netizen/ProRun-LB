
import html2pdf from 'html2pdf.js';

/**
 * Exporta um elemento HTML para PDF com máxima fidelidade visual.
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

  const options = {
    margin: [5, 5, 5, 5], // Adicionado pequena margem de segurança
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['.print-week-block', '.grid'] },
    html2canvas: { 
      scale: 3, // Aumentado para 3x para nitidez máxima em textos pequenos
      useCORS: true, 
      logging: false,
      backgroundColor: '#ffffff',
      letterRendering: true,
      windowWidth: 1200,
      onclone: (clonedDoc: Document) => {
        const el = clonedDoc.getElementById(elementId);
        if (el) {
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          el.style.display = 'block';
          el.style.width = '297mm';
          el.style.height = 'auto'; // Garante altura automática para conteúdo longo
          
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .print-week-block { margin-bottom: 20px !important; }
            #print-layout-root { padding: 10mm !important; }
          `;
          clonedDoc.head.appendChild(style);
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
    // Usamos o motor do html2pdf para salvar o arquivo
    await html2pdf().set(options).from(element).save();
    return true;
  } catch (error) {
    console.error("Falha na exportação PDF:", error);
    alert("Houve um problema na geração do arquivo. O modo de impressão do sistema será aberto como alternativa.");
    window.print();
    return false;
  }
};
