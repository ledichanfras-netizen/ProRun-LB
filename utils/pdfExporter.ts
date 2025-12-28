
/**
 * Utilitário auxiliar para geração de PDF a partir de elementos HTML.
 * Nota: Requer jsPDF e html2canvas (disponíveis via importmap se necessário, 
 * mas preferimos usar window.print() pela precisão CSS).
 */
export class PDFExporter {
  static async exportToPDF(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Fallback amigável: abre o diálogo de impressão que permite salvar como PDF nativamente
    // com maior qualidade e respeitando os media queries de impressão.
    window.print();
  }
}
