import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const UPLOADS_DIR = path.resolve(
  __dirname,
  '../../uploads'
)

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

export interface StorageResult {
  url: string
  path: string
  filename: string
}

export function getUploadsDir(): string {
  return UPLOADS_DIR
}

export function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): StorageResult {
  const ext = path.extname(originalName) || '.bin'
  const filename = `${uuidv4()}${ext}`
  const filePath = path.join(UPLOADS_DIR, filename)

  fs.writeFileSync(filePath, buffer)

  return {
    url: `/uploads/${filename}`,
    path: filePath,
    filename,
  }
}

export function deleteFile(filename: string): void {
  const filePath = path.join(UPLOADS_DIR, filename)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

export function getFileSizeBytes(filePath: string): number {
  try {
    const stat = fs.statSync(filePath)
    return stat.size
  } catch {
    return 0
  }
}
