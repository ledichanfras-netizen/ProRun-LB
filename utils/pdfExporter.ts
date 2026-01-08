
/**
 * Utilitário auxiliar para geração de PDF a partir de elementos HTML.
 * Esta implementação usa html2canvas e jsPDF para gerar PDFs programaticamente.
 */
export class PDFExporter {
  static async exportToPDF(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID '${elementId}' not found`);
      return;
    }

    try {
      // Import dinamicamente as bibliotecas necessárias
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      // Ocultar temporariamente elementos que não devem aparecer no PDF
      const elementsToHide = document.querySelectorAll('.no-print');
      const originalDisplayValues: Array<{ element: Element; display: string }> = [];
      
      elementsToHide.forEach(el => {
        originalDisplayValues.push({
          element: el,
          display: (el as HTMLElement).style.display
        });
        (el as HTMLElement).style.display = 'none';
      });

      // Mostrar temporariamente o conteúdo de impressão
      const printContent = document.getElementById('printable-portal');
      if (printContent) {
        const originalVisibility = printContent.style.visibility;
        printContent.style.visibility = 'visible';
        
        // Redefinir estilos temporários para impressão
        printContent.style.position = 'static';
        printContent.style.width = '100%';
        printContent.style.height = 'auto';
        printContent.style.overflow = 'visible';
        
        // Aguardar um pouco para garantir que os estilos foram aplicados
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Capturar o elemento para converter em PDF
        const canvas = await html2canvas(printContent, {
          scale: 2, // Melhor qualidade
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          logging: false
        });
        
        // Restaurar visibilidade original
        printContent.style.visibility = originalVisibility;
      }

      // Restaurar elementos ocultos
      originalDisplayValues.forEach(({ element, display }) => {
        (element as HTMLElement).style.display = display;
      });

      // Converter canvas para PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular proporções para ajustar imagem ao tamanho do PDF
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = (pdfHeight - imgHeight * ratio) / 2;
      
      // Adicionar imagem ao PDF
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Salvar PDF
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      
      // Se houver erro, usar fallback para impressão
      console.warn('Falha na geração do PDF via html2canvas/jsPDF. Usando fallback para window.print().');
      window.print();
    }
  }
  
  // Método alternativo para exportar conteúdo específico como PDF
  static async exportElementAsPdf(element: HTMLElement, filename: string) {
    if (!element) {
      console.error('Element not provided for PDF export');
      return;
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = (pdfHeight - imgHeight * ratio) / 2;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar elemento como PDF:', error);
      window.print();
    }
  }
}
