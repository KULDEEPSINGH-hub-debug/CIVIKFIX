import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'
import { v4 as uuidv4 } from 'uuid'
import { v2 as cloudinary } from 'cloudinary'

// Ensure local uploads directory exists for development
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads')
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

export interface StorageUploadResult {
  url: string
  publicId?: string
  provider: 'cloudinary' | 'local'
  bytes: number
  mimeType: string
}

export interface StorageResult {
  url: string
  path: string
  filename: string
}

export function isCloudinaryConfigured(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
  return Boolean(cloudName && apiKey && apiSecret)
}

function getCloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })

  return cloudinary
}

export function getUploadsDir(): string {
  return UPLOADS_DIR
}

/**
 * Upload an evidence file to Cloudinary (in production/when configured)
 * or fallback to local uploads directory (in development).
 * Fails safely if Cloudinary is configured but upload rejects.
 */
export async function uploadEvidenceFile(
  file: Express.Multer.File,
  folder: string = 'civicfix/reports'
): Promise<StorageUploadResult> {
  const buffer = file.buffer || (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : null)

  if (!buffer) {
    const err = new Error('File buffer is empty or missing')
    ;(err as any).code = 'FILE_EMPTY'
    throw err
  }

  // If Cloudinary is configured, upload to Cloudinary CDN
  if (isCloudinaryConfigured()) {
    const cld = getCloudinaryClient()

    return new Promise<StorageUploadResult>((resolve, reject) => {
      const uploadStream = cld.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          // If a temporary local file was created by multer, clean it up
          if (file.path && fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path)
            } catch {
              // Ignore cleanup errors
            }
          }

          if (error || !result || !result.secure_url) {
            const uploadErr = new Error(
              `Cloudinary upload failed: ${error?.message || 'Unknown provider error'}`
            )
            ;(uploadErr as any).code = 'STORAGE_UPLOAD_FAILED'
            ;(uploadErr as any).details = error
            return reject(uploadErr)
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            provider: 'cloudinary',
            bytes: result.bytes || buffer.length,
            mimeType: file.mimetype || 'image/jpeg',
          })
        }
      )

      Readable.from(buffer).pipe(uploadStream)
    })
  }

  // Local development storage fallback
  let filename = file.filename
  let filePath = file.path

  if (!filename || !filePath || !fs.existsSync(filePath)) {
    const ext = path.extname(file.originalname || '') || '.jpg'
    filename = `${uuidv4()}${ext}`
    filePath = path.join(UPLOADS_DIR, filename)
    fs.writeFileSync(filePath, buffer)
  }

  const stat = fs.statSync(filePath)

  return {
    url: `/uploads/${filename}`,
    publicId: filename,
    provider: 'local',
    bytes: stat.size,
    mimeType: file.mimetype || 'image/jpeg',
  }
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
