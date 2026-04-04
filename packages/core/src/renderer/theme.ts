export interface Theme {
  background: string
  headerBackground: string
  headerBorder: string
  participantBox: string
  participantBoxBorder: string
  participantText: string
  lifeline: string
  arrowSolid: string
  arrowDashed: string
  arrowLost: string
  arrowAsync: string
  labelText: string
  labelClampedText: string
  blockBackground: string
  blockBorder: string
  blockLabel: string
  noteBackground: string
  noteBorder: string
  noteText: string
  activationFill: string
  activationBorder: string
  scrollbarTrack: string
  scrollbarThumb: string
  autonumberBadge: string
  autonumberText: string
  font: string
  headerFont: string
  labelFont: string
  blockLabelFont: string
  noteFont: string
  autonumberFont: string
}

export const LIGHT_THEME: Theme = {
  background: '#ffffff',
  headerBackground: '#f8f9fa',
  headerBorder: '#dee2e6',
  participantBox: '#e3f2fd',
  participantBoxBorder: '#90caf9',
  participantText: '#1a1a1a',
  lifeline: '#adb5bd',
  arrowSolid: '#333333',
  arrowDashed: '#666666',
  arrowLost: '#e53935',
  arrowAsync: '#333333',
  labelText: '#1a1a1a',
  labelClampedText: '#1565c0',
  blockBackground: 'rgba(227, 242, 253, 0.3)',
  blockBorder: '#90caf9',
  blockLabel: '#1565c0',
  noteBackground: '#fff9c4',
  noteBorder: '#f9a825',
  noteText: '#333333',
  activationFill: '#e3f2fd',
  activationBorder: '#90caf9',
  scrollbarTrack: 'rgba(0, 0, 0, 0.05)',
  scrollbarThumb: 'rgba(0, 0, 0, 0.2)',
  autonumberBadge: '#1565c0',
  autonumberText: '#ffffff',
  font: '13px sans-serif',
  headerFont: 'bold 14px sans-serif',
  labelFont: '13px sans-serif',
  blockLabelFont: 'bold 11px sans-serif',
  noteFont: '12px sans-serif',
  autonumberFont: 'bold 10px sans-serif',
}

export const DARK_THEME: Theme = {
  background: '#1e1e1e',
  headerBackground: '#2d2d2d',
  headerBorder: '#444444',
  participantBox: '#2a3a4a',
  participantBoxBorder: '#4a7ab5',
  participantText: '#e0e0e0',
  lifeline: '#555555',
  arrowSolid: '#cccccc',
  arrowDashed: '#999999',
  arrowLost: '#ef5350',
  arrowAsync: '#cccccc',
  labelText: '#e0e0e0',
  labelClampedText: '#64b5f6',
  blockBackground: 'rgba(42, 58, 74, 0.4)',
  blockBorder: '#4a7ab5',
  blockLabel: '#64b5f6',
  noteBackground: '#3e3a20',
  noteBorder: '#8a7a20',
  noteText: '#e0e0e0',
  activationFill: '#2a3a4a',
  activationBorder: '#4a7ab5',
  scrollbarTrack: 'rgba(255, 255, 255, 0.05)',
  scrollbarThumb: 'rgba(255, 255, 255, 0.2)',
  autonumberBadge: '#4a7ab5',
  autonumberText: '#ffffff',
  font: '13px sans-serif',
  headerFont: 'bold 14px sans-serif',
  labelFont: '13px sans-serif',
  blockLabelFont: 'bold 11px sans-serif',
  noteFont: '12px sans-serif',
  autonumberFont: 'bold 10px sans-serif',
}

export function getTheme(name: 'light' | 'dark'): Theme {
  return name === 'dark' ? DARK_THEME : LIGHT_THEME
}
