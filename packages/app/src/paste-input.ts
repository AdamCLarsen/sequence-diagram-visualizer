const STORAGE_KEY = 'seq-viz-paste'
const DEBOUNCE_MS = 300

export interface PasteInput {
  element: HTMLTextAreaElement
  getValue(): string
  destroy(): void
}

export interface PasteInputOptions {
  onClose?: () => void
}

export function createPasteInput(
  container: HTMLElement,
  onUpdate: (text: string) => void,
  options: PasteInputOptions = {},
): PasteInput {
  const textarea = document.createElement('textarea')
  textarea.className = 'w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 pt-12 resize-none border-none outline-none'
  textarea.placeholder = 'Paste Mermaid sequenceDiagram syntax here...\n\nExample:\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi!'
  textarea.spellcheck = false

  // Restore from localStorage
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    textarea.value = stored
  }

  let timer: ReturnType<typeof setTimeout> | null = null

  const handleInput = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const text = textarea.value
      localStorage.setItem(STORAGE_KEY, text)
      onUpdate(text)
    }, DEBOUNCE_MS)
  }

  textarea.addEventListener('input', handleInput)
  container.appendChild(textarea)

  // Floating close button in the top-right of the paste overlay.
  let closeBtn: HTMLButtonElement | null = null
  if (options.onClose) {
    closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.title = 'Close paste view'
    closeBtn.setAttribute('aria-label', 'Close paste view')
    closeBtn.className =
      'absolute top-2 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full ' +
      'bg-gray-700 hover:bg-gray-600 text-gray-200 text-xl leading-none shadow'
    closeBtn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
    closeBtn.addEventListener('click', options.onClose)
    container.appendChild(closeBtn)
  }

  // Trigger initial render if there's stored content
  if (stored) {
    setTimeout(() => onUpdate(stored), 0)
  }

  return {
    element: textarea,
    getValue: () => textarea.value,
    destroy: () => {
      if (timer) clearTimeout(timer)
      textarea.removeEventListener('input', handleInput)
      textarea.remove()
      closeBtn?.remove()
    },
  }
}
