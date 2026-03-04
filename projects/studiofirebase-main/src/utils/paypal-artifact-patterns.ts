/**
 * Text patterns that should be hidden from PayPal Hosted Buttons
 * These are typically UI artifacts or sponsor text that don't match the design
 */
export const TEXT_ARTIFACT_PATTERNS = [
  /\bpay\s*now\b/i,
  /\bcard\s*icons\b/i,
  /\|/,
  /italo\s+santos/i,
  /99[,\.\s]*00\s*brl/i
];

/**
 * Removes text nodes matching artifact patterns from a DOM element
 * @param target The container element to clean
 */
export function removeTextArtifacts(target: HTMLElement): void {
  try {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const nodesToClear: Node[] = [];
    let current = walker.nextNode();
    
    while (current) {
      const content = current.textContent || "";
      if (TEXT_ARTIFACT_PATTERNS.some((pattern) => pattern.test(content))) {
        nodesToClear.push(current);
      }
      current = walker.nextNode();
    }
    
    nodesToClear.forEach((node) => {
      node.textContent = '';
    });
  } catch (e) {
    console.warn('[PayPal Clean] Error removing artifacts:', e);
  }
}

/**
 * Sets up continuous monitoring and removal of text artifacts
 * @param target The container element to observe
 * @returns A function to disconnect the observer
 */
export function setupArtifactObserver(target: HTMLElement): () => void {
  const observer = new MutationObserver(() => {
    removeTextArtifacts(target);
  });

  observer.observe(target, { childList: true, subtree: true });
  removeTextArtifacts(target); // Initial cleanup

  return () => observer.disconnect();
}
