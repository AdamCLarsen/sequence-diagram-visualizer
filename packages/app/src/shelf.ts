export interface ShelfOptions {
  onOpen: () => void
  onReload: () => void
  onPasteToggle: (active: boolean) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  getZoom: () => number
}

export interface Shelf {
  element: HTMLElement
  setFileName(name: string | null): void
  setReloadVisible(visible: boolean): void
  updateZoom(): void
  destroy(): void
}

export function createShelf(options: ShelfOptions): Shelf {
  const el = document.createElement('div')
  el.className = 'fixed left-0 top-0 h-full z-50 flex flex-col bg-gray-800 text-white shadow-lg transition-all duration-200'

  let collapsed = true
  let pasteActive = false

  const render = () => {
    const w = collapsed ? 'w-10' : 'w-56'
    el.className = `fixed left-0 top-0 h-full z-50 flex flex-col bg-gray-800 text-white shadow-lg transition-all duration-200 ${w}`
    el.innerHTML = ''

    // Toggle button
    const toggleBtn = btn(collapsed ? '\u25B6' : '\u25C0', () => {
      collapsed = !collapsed
      render()
    }, 'Toggle shelf')
    toggleBtn.className += ' mb-2'
    el.appendChild(toggleBtn)

    // File open
    el.appendChild(btn('\uD83D\uDCC2', options.onOpen, 'Open file', !collapsed ? 'Open File' : ''))

    // Reload (conditionally visible)
    const reloadBtn = btn('\u21BB', options.onReload, 'Reload file', !collapsed ? 'Reload' : '')
    reloadBtn.id = 'shelf-reload'
    reloadBtn.style.display = 'none'
    el.appendChild(reloadBtn)

    // Paste toggle
    el.appendChild(btn(
      pasteActive ? '\u2328' : '\u2328',
      () => {
        pasteActive = !pasteActive
        options.onPasteToggle(pasteActive)
        render()
      },
      'Paste input',
      !collapsed ? (pasteActive ? 'Close Paste' : 'Paste') : '',
    ))

    // Divider
    const divider = document.createElement('div')
    divider.className = 'border-t border-gray-600 my-2 mx-1'
    el.appendChild(divider)

    // Zoom controls
    el.appendChild(btn('+', options.onZoomIn, 'Zoom in'))
    el.appendChild(btn('\u2013', options.onZoomOut, 'Zoom out'))
    el.appendChild(btn('\u26F6', options.onZoomReset, 'Reset zoom'))

    // Zoom indicator
    const zoomLabel = document.createElement('div')
    zoomLabel.id = 'shelf-zoom'
    zoomLabel.className = 'text-center text-xs text-gray-400 mt-1'
    zoomLabel.textContent = Math.round(options.getZoom() * 100) + '%'
    el.appendChild(zoomLabel)

    // File name indicator (spacer + bottom)
    const spacer = document.createElement('div')
    spacer.className = 'flex-1'
    el.appendChild(spacer)

    const fileLabel = document.createElement('div')
    fileLabel.id = 'shelf-filename'
    fileLabel.className = 'text-xs text-gray-400 p-2 truncate'
    el.appendChild(fileLabel)
  }

  render()

  return {
    element: el,

    setFileName(name: string | null) {
      const label = el.querySelector('#shelf-filename')
      if (label) label.textContent = name ?? ''
    },

    setReloadVisible(visible: boolean) {
      const reloadBtn = el.querySelector('#shelf-reload') as HTMLElement
      if (reloadBtn) reloadBtn.style.display = visible ? '' : 'none'
    },

    updateZoom() {
      const label = el.querySelector('#shelf-zoom')
      if (label) label.textContent = Math.round(options.getZoom() * 100) + '%'
    },

    destroy() {
      el.remove()
    },
  }
}

function btn(icon: string, onClick: () => void, title: string, label = ''): HTMLButtonElement {
  const b = document.createElement('button')
  b.className = 'flex items-center gap-2 px-2 py-1.5 hover:bg-gray-700 rounded mx-1 text-sm whitespace-nowrap'
  b.title = title
  b.innerHTML = `<span>${icon}</span>${label ? `<span class="truncate">${label}</span>` : ''}`
  b.addEventListener('click', onClick)
  return b
}
