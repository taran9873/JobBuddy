import { Request, Response, NextFunction } from 'express';

// Error interface
export interface ApiError extends Error {
  statusCode?: number;
  errors?: any[];
}

/**
 * Custom error handling middleware
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default status code and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error for debugging
  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  
  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

/**
 * Not found middleware for 404 errors
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error: ApiError = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Create a custom API error
 */
export class AppError extends Error implements ApiError {
  statusCode: number;
  errors?: any[];
  
  constructor(message: string, statusCode = 400, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    
    // Set prototype explicitly.
    Object.setPrototypeOf(this, AppError.prototype);
    
    Error.captureStackTrace(this, this.constructor);
  }
} 