import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  code?: string
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error('[Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
  })

  const statusCode = err.statusCode || 500
  const code = err.code || 'INTERNAL_SERVER_ERROR'
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An internal server error occurred'
      : err.message || 'Something went wrong'

  res.status(statusCode).json({
    success: false,
    error: { message, code },
  })
}

export function createError(message: string, statusCode: number, code?: string): AppError {
  const error: AppError = new Error(message)
  error.statusCode = statusCode
  error.code = code
  return error
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  })
}
