export type ErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_SITE"
  | "NETWORK"
  | "HTTP_STATUS"
  | "BLOCKED"
  | "NOT_FOUND"
  | "PARSE_FAILED"
  | "CHAPTER_LIST_EMPTY"
  | "CHAPTER_NO_IMAGES"
  | "CHAPTER_MISMATCH"
  | "IMAGE_CORRUPT"
  | "FILE_SYSTEM"
  | "UNSAFE_URL"
  | "RESPONSE_TOO_LARGE"
  | "INVALID_INPUT"
  | "BUSY"
  | "CANCELLED"
  | "UNKNOWN";

export type ErrorDetails = Record<
  string,
  string | number | boolean | null | string[]
>;

export interface SerializedError {
  code: ErrorCode;
  message: string;
  details: ErrorDetails;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details: ErrorDetails;

  constructor(
    code: ErrorCode,
    message: string,
    details: ErrorDetails = {},
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error &&
  typeof (error as NodeJS.ErrnoException).code === "string";

export const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  if (isNodeError(error) && error.syscall !== undefined) {
    return new AppError(
      "FILE_SYSTEM",
      error.message,
      { errno: error.code ?? null, path: error.path ?? null },
      error,
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return new AppError("UNKNOWN", message, {}, error);
};

export const serializeError = (error: unknown): SerializedError => {
  const { code, message, details } = toAppError(error);
  return { code, message, details };
};
