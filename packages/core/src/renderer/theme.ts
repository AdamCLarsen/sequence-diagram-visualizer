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
  blockTagLabelFont: string
  blockTagLabelBackground: string
  blockTagLabelText: string
  noteFont: string
  autonumberFont: string
  sourceLabelText: string
  sourceLabelFont: string
}

export const LIGHT_THEME: Theme = {
  background: '#ffffff',
  headerBackground: '#fafafa',
  headerBorder: '#e5e5e5',
  participantBox: '#f4f4f5',
  participantBoxBorder: '#d4d4d8',
  participantText: '#09090b',
  lifeline: '#a1a1aa',
  arrowSolid: '#18181b',
  arrowDashed: '#71717a',
  arrowLost: '#dc2626',
  arrowAsync: '#18181b',
  labelText: '#09090b',
  labelClampedText: '#2563eb',
  blockBackground: 'rgba(244, 244, 245, 0.5)',
  blockBorder: '#a1a1aa',
  blockLabel: '#3f3f46',
  noteBackground: '#fefce8',
  noteBorder: '#ca8a04',
  noteText: '#1c1917',
  activationFill: '#dbeafe',
  activationBorder: '#3b82f6',
  scrollbarTrack: 'rgba(0, 0, 0, 0.04)',
  scrollbarThumb: 'rgba(0, 0, 0, 0.15)',
  autonumberBadge: '#18181b',
  autonumberText: '#fafafa',
  font: '13px sans-serif',
  headerFont: 'bold 14px sans-serif',
  labelFont: '13px sans-serif',
  blockLabelFont: 'bold 11px sans-serif',
  blockTagLabelFont: '11px sans-serif',
  blockTagLabelBackground: 'rgba(0, 0, 0, 0.06)',
  blockTagLabelText: '#3f3f46',
  noteFont: '12px sans-serif',
  autonumberFont: 'bold 10px sans-serif',
  sourceLabelText: '#7c3aed',
  sourceLabelFont: 'italic 11px sans-serif',
}

export const DARK_THEME: Theme = {
  background: '#09090b',
  headerBackground: '#18181b',
  headerBorder: '#27272a',
  participantBox: '#1c1c1f',
  participantBoxBorder: '#3f3f46',
  participantText: '#fafafa',
  lifeline: '#71717a',
  arrowSolid: '#e4e4e7',
  arrowDashed: '#a1a1aa',
  arrowLost: '#ef4444',
  arrowAsync: '#e4e4e7',
  labelText: '#fafafa',
  labelClampedText: '#60a5fa',
  blockBackground: 'rgba(39, 39, 42, 0.5)',
  blockBorder: '#52525b',
  blockLabel: '#a1a1aa',
  noteBackground: '#27272a',
  noteBorder: '#a1a1aa',
  noteText: '#fafafa',
  activationFill: '#1e3a5f',
  activationBorder: '#60a5fa',
  scrollbarTrack: 'rgba(255, 255, 255, 0.04)',
  scrollbarThumb: 'rgba(255, 255, 255, 0.15)',
  autonumberBadge: '#fafafa',
  autonumberText: '#09090b',
  font: '13px sans-serif',
  headerFont: 'bold 14px sans-serif',
  labelFont: '13px sans-serif',
  blockLabelFont: 'bold 11px sans-serif',
  blockTagLabelFont: '11px sans-serif',
  blockTagLabelBackground: 'rgba(255, 255, 255, 0.08)',
  blockTagLabelText: '#d4d4d8',
  noteFont: '12px sans-serif',
  autonumberFont: 'bold 10px sans-serif',
  sourceLabelText: '#c084fc',
  sourceLabelFont: 'italic 11px sans-serif',
}

export function getTheme(name: 'light' | 'dark'): Theme {
  return name === 'dark' ? DARK_THEME : LIGHT_THEME
}
