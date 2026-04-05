const PARAM = 'd'

/** Gzip-compress text and return a base64url-encoded string */
export async function compressDiagram(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(data)
  writer.close()

  const compressed = new Uint8Array(await new Response(cs.readable).arrayBuffer())

  let binary = ''
  for (const byte of compressed) binary += String.fromCharCode(byte)

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Decode a base64url string and gzip-decompress it back to text */
export async function decompressDiagram(encoded: string): Promise<string> {
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4 !== 0) b64 += '='

  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  writer.write(bytes)
  writer.close()

  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer())
}

/** Build a shareable URL containing the gzipped diagram */
export async function buildShareUrl(diagramText: string): Promise<string> {
  const compressed = await compressDiagram(diagramText)
  const url = new URL(window.location.href)
  // Strip existing params — share link should be clean
  for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key)
  url.searchParams.set(PARAM, compressed)
  return url.toString()
}

/** Read the shared diagram param from the current URL (null if absent) */
export function getSharedParam(): string | null {
  return new URL(window.location.href).searchParams.get(PARAM)
}

/** Remove the shared param from the URL bar without reloading */
export function clearSharedParam(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(PARAM)) return
  url.searchParams.delete(PARAM)
  window.history.replaceState(null, '', url.toString())
}
