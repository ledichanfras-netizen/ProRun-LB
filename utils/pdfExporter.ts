
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

  // Sincronização: Aguarda o React montar o conteúdo no Portal
  // Aumentamos a verificação para garantir que o conteúdo não seja apenas estrutural
  let attempts = 0;
  const minContentLength = 1500; 
  while ((!element.innerHTML || element.innerHTML.trim().length < minContentLength) && attempts < 40) {
    await new Promise(resolve => setTimeout(resolve, 150));
    attempts++;
  }

  if (!element.innerHTML.trim() || element.innerHTML.trim().length < minContentLength) {
    console.warn("AVISO: Conteúdo do portal parece incompleto ou muito curto.");
  }

  // Forçamos o scroll para o topo para evitar deslocamentos do html2canvas
  window.scrollTo(0, 0);

  const options = {
    margin: 0,
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    pagebreak: { mode: ['css', 'legacy'], avoid: '.print-week-block' },
    html2canvas: { 
      scale: 3, // Escala 3x para máxima nitidez em fontes pequenas
      useCORS: true, 
      logging: false,
      backgroundColor: '#ffffff',
      letterRendering: true,
      allowTaint: false, // Taint true pode causar o PDF em branco se houver imagens externas
      onclone: (clonedDoc: Document) => {
        const el = clonedDoc.getElementById(elementId);
        if (el) {
          // No documento clonado, o portal deve estar perfeitamente visível e posicionado
          el.style.position = 'static';
          el.style.transform = 'none';
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          el.style.display = 'block';
          el.style.width = '297mm';
          el.style.margin = '0';
          el.style.padding = '30px'; // Padding de segurança interno
          
          // Desativa animações globalmente no clone para captura estática pura
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { transition: none !important; animation: none !important; }
            .animate-fade-in, .animate-fade-in-up { opacity: 1 !important; transform: none !important; }
          `;
          clonedDoc.head.appendChild(style);
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
