const editable = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/** Whether typing would go into this element, so a key press isn't a shortcut. */
export function isEditable(element: Element | null) {
  return !!element?.closest(editable);
}

/**
 * The page's selection when Ari can save it: text in the page itself, not in a form field, an
 * editor, a component's shadow root or Ari's own UI (`ui`).
 */
export function selectedRange(document: Document, ui: Element): Range | null {
  const selection = document.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!range.toString().trim()) return null;
  const container = range.commonAncestorContainer;
  const element = container.nodeType === Node.ELEMENT_NODE ? (container as Element) : null;
  const parent = element ?? container.parentElement;
  if (!parent || parent.getRootNode() !== document || ui.contains(parent) || isEditable(parent)) {
    return null;
  }
  return range.cloneRange();
}
