
/**
 * Basic sanitization for user inputs to prevent XSS.
 * For a complete solution, consider using a library like DOMPurify for HTML content,
 * but for simple text inputs, this helper removes dangerous characters.
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validates if a string is a safe ID (alphanumeric, underscores, hyphens).
 */
export const isValidId = (id: string): boolean => {
  return /^[a-zA-Z0-9_\-]+$/.test(id);
};
