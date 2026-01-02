export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password.') {
    super(401, 'INVALID_CREDENTIALS', message);
  }
}

export class UserNotFoundError extends AppError {
  constructor(message = 'User not found.') {
    super(404, 'USER_NOT_FOUND', message);
  }
}

export class InvalidPasswordError extends AppError {
  constructor(message = 'Invalid password.') {
    super(401, 'INVALID_PASSWORD', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, 'BAD_REQUEST', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error') {
    super(500, 'DATABASE_ERROR', message);
  }
}
