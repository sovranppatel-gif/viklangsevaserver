export function publicUploadPath(folder, filename) {
  const relative = `/uploads/${folder}/${filename}`
  const base = String(process.env.PUBLIC_API_URL || '')
    .trim()
    .replace(/\/$/, '')

  return base ? `${base}${relative}` : relative
}
