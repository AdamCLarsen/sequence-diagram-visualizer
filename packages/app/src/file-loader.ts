export interface FileLoadResult {
  content: string
  name: string
  handle?: FileSystemFileHandle
}

/**
 * Open a file using File System Access API with fallback to standard input.
 */
export async function openFile(): Promise<FileLoadResult | null> {
  // Try File System Access API first
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Diagram files',
            accept: {
              'text/plain': ['.mmd', '.mermaid', '.md', '.txt'],
            },
          },
        ],
        multiple: false,
      })
      const file = await handle.getFile()
      const content = await file.text()
      return { content, name: file.name, handle }
    } catch (e) {
      // User cancelled or API not available
      if ((e as Error).name === 'AbortError') return null
    }
  }

  // Fallback to standard file input
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mmd,.mermaid,.md,.txt'

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      const content = await file.text()
      resolve({ content, name: file.name })
    }

    input.oncancel = () => resolve(null)
    input.click()
  })
}

/**
 * Reload a file from a File System Access API handle.
 */
export async function reloadFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile()
  return file.text()
}

/**
 * Read a file from a drop event.
 */
export async function readDroppedFile(e: DragEvent): Promise<FileLoadResult | null> {
  const file = e.dataTransfer?.files[0]
  if (!file) return null
  const content = await file.text()
  return { content, name: file.name }
}
