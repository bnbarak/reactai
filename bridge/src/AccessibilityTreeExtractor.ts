const SEMANTIC_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'button',
  'input',
  'select',
  'textarea',
  'a',
  'nav',
  'main',
  'header',
  'footer',
  'section',
  'aside',
]);

const MAX_NODES = 60;
const MAX_TEXT_LEN = 40;

function getAccessibleName(el: Element): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = el.ownerDocument.getElementById(labelledBy);
    if (labelEl) return labelEl.textContent?.trim().slice(0, MAX_TEXT_LEN) ?? '';
  }

  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return placeholder;

  const text = el.textContent?.trim().slice(0, MAX_TEXT_LEN) ?? '';
  return text;
}

function domDepth(el: Element, root: Element): number {
  let depth = 0;
  let current: Element | null = el;
  while (current && current !== root) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}

export function extractAccessibilityTree(root: Element = document.body): string {
  const lines: string[] = [];
  let nodeCount = 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (SEMANTIC_TAGS.has(tag) || el.hasAttribute('data-ai-id') || el.hasAttribute('role')) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    },
  });

  let current = walker.nextNode() as Element | null;
  while (current) {
    if (nodeCount >= MAX_NODES) {
      const remaining = countRemainingNodes(walker);
      lines.push(`... (${remaining + 1} more nodes)`);
      break;
    }

    const tag = current.tagName.toLowerCase();
    const depth = Math.min(domDepth(current, root), 6);
    const indent = '  '.repeat(depth);
    const name = getAccessibleName(current);
    const aiId = current.getAttribute('data-ai-id');
    const aiKey = current.getAttribute('data-ai-key');

    let line = `${indent}${tag}`;
    if (name) line += ` "${name}"`;
    if (aiId) line += ` [ai:${aiId}]`;
    if (aiKey) line += ` (${aiKey})`;

    lines.push(line);
    nodeCount++;
    current = walker.nextNode() as Element | null;
  }

  return lines.join('\n');
}

function countRemainingNodes(walker: TreeWalker): number {
  let count = 0;
  while (walker.nextNode()) count++;
  return count;
}
