export interface ShelfOptions {
  onOpen: () => void
  onReload: () => void
  onPasteToggle: (active: boolean) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  getZoom: () => number
  onOffscreenLabelsToggle: (enabled: boolean) => void
  getOffscreenLabels: () => boolean
  onSourceLabelsToggle: (enabled: boolean) => void
  getSourceLabels: () => boolean
  onWidthChange?: (widthPx: number) => void
}

export interface Shelf {
  element: HTMLElement
  setFileName(name: string | null): void
  setReloadVisible(visible: boolean): void
  updateZoom(): void
  refresh(): void
  destroy(): void
}

// Lucide-style SVG icons (24x24, stroke-based)
const ICONS = {
  panelOpen: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>',
  panelClose: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>',
  folderOpen: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>',
  reload: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
  clipboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>',
  zoomIn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>',
  zoomOut: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>',
  scan: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>',
  tag: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
  cornerDownLeft: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>',
}

export function createShelf(options: ShelfOptions): Shelf {
  const el = document.createElement('div')
  el.className = 'fixed left-0 top-0 h-full z-50 flex flex-col bg-gray-800 text-white shadow-lg transition-all duration-200'

  let collapsed = true
  let pasteActive = false

  const COLLAPSED_WIDTH = 40  // w-10
  const EXPANDED_WIDTH = 224  // w-56

  const render = () => {
    const w = collapsed ? 'w-10' : 'w-56'
    el.className = `fixed left-0 top-0 h-full z-50 flex flex-col bg-gray-800 text-white shadow-lg transition-all duration-200 ${w}`
    el.innerHTML = ''
    options.onWidthChange?.(collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH)

    // Toggle button
    const toggleBtn = btn(collapsed ? ICONS.panelOpen : ICONS.panelClose, () => {
      collapsed = !collapsed
      render()
    }, 'Toggle shelf')
    toggleBtn.className += ' mb-2'
    el.appendChild(toggleBtn)

    // File open
    el.appendChild(btn(ICONS.folderOpen, options.onOpen, 'Open file', !collapsed ? 'Open File' : ''))

    // Reload (conditionally visible)
    const reloadBtn = btn(ICONS.reload, options.onReload, 'Reload file', !collapsed ? 'Reload' : '')
    reloadBtn.id = 'shelf-reload'
    reloadBtn.style.display = 'none'
    el.appendChild(reloadBtn)

    // Paste toggle
    el.appendChild(btn(
      ICONS.clipboard,
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
    el.appendChild(btn(ICONS.zoomIn, options.onZoomIn, 'Zoom in', !collapsed ? 'Zoom In' : ''))
    el.appendChild(btn(ICONS.zoomOut, options.onZoomOut, 'Zoom out', !collapsed ? 'Zoom Out' : ''))

    const zoomPct = Math.round(options.getZoom() * 100) + '%'
    el.appendChild(btn(ICONS.scan, options.onZoomReset, 'Reset zoom', !collapsed ? zoomPct : ''))
    // Tag the reset button so we can update the label
    el.lastElementChild!.id = 'shelf-zoom-btn'

    // Offscreen labels toggle
    const labelsOn = options.getOffscreenLabels()
    const labelsBtn = btn(
      ICONS.tag,
      () => { options.onOffscreenLabelsToggle(!options.getOffscreenLabels()); render() },
      'Toggle off-screen labels',
      !collapsed ? (labelsOn ? 'Labels: On' : 'Labels: Off') : '',
    )
    if (!labelsOn) labelsBtn.style.opacity = '0.4'
    el.appendChild(labelsBtn)

    // Source labels toggle
    const srcOn = options.getSourceLabels()
    const srcBtn = btn(
      ICONS.cornerDownLeft,
      () => { options.onSourceLabelsToggle(!options.getSourceLabels()); render() },
      'Toggle source labels',
      !collapsed ? (srcOn ? 'Source: On' : 'Source: Off') : '',
    )
    if (!srcOn) srcBtn.style.opacity = '0.4'
    el.appendChild(srcBtn)

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

    refresh() { render() },

    updateZoom() {
      const btn = el.querySelector('#shelf-zoom-btn')
      if (!btn) return
      const labelSpan = btn.querySelector('span:last-child')
      if (labelSpan && labelSpan !== btn.querySelector('span:first-child')) {
        labelSpan.textContent = Math.round(options.getZoom() * 100) + '%'
      }
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
  b.innerHTML = `<span class="w-[18px] h-[18px] shrink-0 flex items-center justify-center">${icon}</span>${label ? `<span class="truncate">${label}</span>` : ''}`
  b.addEventListener('click', onClick)
  return b
}
