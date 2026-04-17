export interface ShelfOptions {
  onOpen: () => void
  onReload: () => void
  onPasteToggle: (active: boolean) => void
  onShareLink: () => Promise<void>
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  getZoom: () => number
  onSourceLabelsToggle: (enabled: boolean) => void
  getSourceLabels: () => boolean
  onDarkModeToggle: (dark: boolean) => void
  getDarkMode: () => boolean
  onDiagramColorsToggle: (enabled: boolean) => void
  getDiagramColors: () => boolean
  onClearSelection: () => void
  getSelectionCount: () => number
  onWidthChange?: (widthPx: number) => void
}

export interface Shelf {
  element: HTMLElement
  setFileName(name: string | null): void
  setReloadVisible(visible: boolean): void
  setPasteActive(active: boolean): void
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
  cornerDownLeft: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>',
  moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  palette: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  xCircle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  link: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  github: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>',
}

export function createShelf(options: ShelfOptions): Shelf {
  const el = document.createElement('div')
  el.className = 'fixed left-0 top-0 h-full z-50 flex flex-col bg-gray-800 text-white shadow-lg transition-all duration-200'

  let collapsed = true
  let pasteActive = false
  let linkCopied = false

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

    // Share link
    const linkBtn = btn(
      linkCopied ? ICONS.check : ICONS.link,
      async () => {
        await options.onShareLink()
        linkCopied = true
        render()
        setTimeout(() => { linkCopied = false; render() }, 2000)
      },
      'Copy share link',
      !collapsed ? (linkCopied ? 'Copied!' : 'Share Link') : '',
    )
    el.appendChild(linkBtn)

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

    // Divider
    const divider2 = document.createElement('div')
    divider2.className = 'border-t border-gray-600 my-2 mx-1'
    el.appendChild(divider2)

    // Dark mode toggle
    const isDark = options.getDarkMode()
    el.appendChild(btn(
      isDark ? ICONS.sun : ICONS.moon,
      () => { options.onDarkModeToggle(!options.getDarkMode()); render() },
      'Toggle dark mode',
      !collapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : '',
    ))

    // Diagram colors toggle
    const colorsOn = options.getDiagramColors()
    const colorsBtn = btn(
      ICONS.palette,
      () => { options.onDiagramColorsToggle(!options.getDiagramColors()); render() },
      'Toggle diagram colors',
      !collapsed ? (colorsOn ? 'Colors: On' : 'Colors: Off') : '',
    )
    if (!colorsOn) colorsBtn.style.opacity = '0.4'
    el.appendChild(colorsBtn)

    // Clear selection button (only visible when participants are selected)
    const selCount = options.getSelectionCount()
    if (selCount > 0) {
      const divider3 = document.createElement('div')
      divider3.className = 'border-t border-gray-600 my-2 mx-1'
      el.appendChild(divider3)

      const clearBtn = btn(
        ICONS.xCircle,
        () => { options.onClearSelection(); render() },
        'Clear selection',
        !collapsed ? `Clear (${selCount})` : '',
      )
      clearBtn.id = 'shelf-clear-selection'
      el.appendChild(clearBtn)
    }

    // File name indicator (spacer + bottom)
    const spacer = document.createElement('div')
    spacer.className = 'flex-1'
    el.appendChild(spacer)

    // GitHub link
    const ghLink = document.createElement('a')
    ghLink.href = 'https://github.com/AdamCLarsen/sequence-diagram-visualizer'
    ghLink.target = '_blank'
    ghLink.rel = 'noopener noreferrer'
    ghLink.title = 'View on GitHub'
    ghLink.className = 'flex items-center gap-2 px-2 py-1.5 hover:bg-gray-700 rounded mx-1 text-sm whitespace-nowrap text-gray-400 hover:text-white'
    ghLink.innerHTML = `<span class="w-[18px] h-[18px] shrink-0 flex items-center justify-center">${ICONS.github}</span>${!collapsed ? '<span class="truncate">GitHub</span>' : ''}`
    el.appendChild(ghLink)

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

    setPasteActive(active: boolean) {
      if (pasteActive === active) return
      pasteActive = active
      render()
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
