// Browser file I/O wrapper with two paths:
//
//   1. File System Access API (Chrome / Edge / Opera) — full read +
//      in-place write via FileSystemFileHandle. Supports "save back to
//      the same file" without re-prompting.
//   2. Fallback (Firefox / Safari) — <input type="file"> for read,
//      <a download> for write. Save-as works; in-place save degrades
//      to save-as (the browser doesn't expose the original handle).
//
// Detection: typeof window.showOpenFilePicker === 'function' is the
// gate. Everything else uses the fallback.

export interface OpenedFile {
  name: string
  source: string
  handle: FileSystemFileHandle | null
}

interface FilePickerAcceptType {
  description?: string
  accept: Record<string, string[]>
}

// Window typings for the FS Access API. lib.dom.d.ts in TS 6 has
// FileSystemFileHandle but not the picker entry points yet (they're
// still flagged "experimental" upstream), so we declare them locally.
declare global {
  interface Window {
    showOpenFilePicker?: (options: {
      types: FilePickerAcceptType[]
      multiple?: boolean
      excludeAcceptAllOption?: boolean
    }) => Promise<FileSystemFileHandle[]>
    showSaveFilePicker?: (options: {
      types: FilePickerAcceptType[]
      suggestedName?: string
      excludeAcceptAllOption?: boolean
    }) => Promise<FileSystemFileHandle>
  }
}

const PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: 'MIPS assembly',
    accept: { 'text/x-asm': ['.asm', '.s', '.S', '.mips'] },
  },
]

const FALLBACK_ACCEPT = '.asm,.s,.S,.mips'

export function hasNativeFilePicker(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}

export async function openFile(): Promise<OpenedFile | null> {
  if (hasNativeFilePicker() && window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: PICKER_TYPES,
        multiple: false,
      })
      if (!handle) return null
      const file = await handle.getFile()
      const source = await file.text()
      return { name: file.name, source, handle }
    } catch (e) {
      if (isAbort(e)) return null
      throw e
    }
  }

  // Fallback: hidden <input type="file">
  return new Promise<OpenedFile | null>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = FALLBACK_ACCEPT
    input.style.display = 'none'

    function cleanup(): void {
      input.remove()
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        cleanup()
        resolve(null)
        return
      }
      file
        .text()
        .then((source) => {
          cleanup()
          resolve({ name: file.name, source, handle: null })
        })
        .catch(() => {
          cleanup()
          resolve(null)
        })
    })

    // Some browsers fire `cancel` when the picker is dismissed without a selection.
    input.addEventListener('cancel', () => {
      cleanup()
      resolve(null)
    })

    document.body.appendChild(input)
    input.click()
  })
}

export async function saveFile(file: OpenedFile): Promise<OpenedFile> {
  // Native path: write back through the existing handle.
  if (file.handle && hasNativeFilePicker()) {
    const handle = file.handle as FileSystemFileHandle & {
      createWritable?: () => Promise<{
        write: (data: string) => Promise<void>
        close: () => Promise<void>
      }>
    }
    if (typeof handle.createWritable === 'function') {
      const writable = await handle.createWritable()
      await writable.write(file.source)
      await writable.close()
      return file
    }
  }
  // Fallback or no handle: defer to save-as (download).
  const saved = await saveFileAs(file.source, file.name)
  return saved ?? file
}

export async function saveFileAs(
  source: string,
  suggestedName: string,
): Promise<OpenedFile | null> {
  if (hasNativeFilePicker() && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        types: PICKER_TYPES,
        suggestedName,
      })
      const writable = await (handle as FileSystemFileHandle & {
        createWritable: () => Promise<{
          write: (data: string) => Promise<void>
          close: () => Promise<void>
        }>
      }).createWritable()
      await writable.write(source)
      await writable.close()
      return { name: handle.name, source, handle }
    } catch (e) {
      if (isAbort(e)) return null
      throw e
    }
  }

  // Fallback: blob download
  const blob = new Blob([source], { type: 'text/x-asm' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { name: suggestedName, source, handle: null }
}
