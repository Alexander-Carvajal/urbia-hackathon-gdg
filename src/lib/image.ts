export const MAX_PHOTO_MB = 5
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Reduce la imagen y la vuelve a codificar con canvas. Al redibujarla se descartan los
 * metadatos EXIF (incluida la ubicación GPS de la cámara).
 */
export function processPhoto(file: File, maxSide = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_TYPES.includes(file.type)) { reject(new Error('Formato no admitido. Usa JPG, PNG o WebP.')); return }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) { reject(new Error(`La imagen supera ${MAX_PHOTO_MB} MB.`)); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('No se pudo procesar la imagen.')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')) }
    img.src = url
  })
}
