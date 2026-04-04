const STORAGE_KEY = 'seq-viz-paste'
const DEBOUNCE_MS = 300

export interface PasteInput {
  element: HTMLTextAreaElement
  getValue(): string
  destroy(): void
}

export function createPasteInput(
  container: HTMLElement,
  onUpdate: (text: string) => void,
): PasteInput {
  const textarea = document.createElement('textarea')
  textarea.className = 'w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 resize-none border-none outline-none'
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
    },
  }
}
