import { z } from "@hono/zod-openapi";

export type StatusOK = 200;
export type StatusCreated = 201;
export type StatusNoContent = 204;
export type StatusBadRequest = 400;
export type StatusNotFound = 404;
export type StatusBadGateway = 502;
export type StatusConflict = 409;
export type StatusGone = 410;
export type StatusInternalServerError = 500;

export type ErrorCodes = [
  StatusBadRequest,
  StatusNotFound,
  StatusConflict,
  StatusGone,
  StatusInternalServerError,
  StatusBadGateway,
];
export type ErrorCode = ErrorCodes[number];

export type SuccessCodes = [StatusOK, StatusCreated, StatusNoContent];
export type SuccessCode = SuccessCodes[number];

export type StatusCodes = [...SuccessCodes, ...ErrorCodes];
export type StatusCode = StatusCodes[number];

export type Error<T extends ErrorCode> = {
  ok: false;
  statusCode: T;
  errorResponse: {
    error: string;
    details: any;
  };
};

export type Success<T, C extends SuccessCode> = {
  ok: true;
  statusCode: C;
  result: T;
};

export type Result<T, C extends SuccessCode, E extends ErrorCode> =
  | Success<T, C>
  | Error<E>;

export function isD1Error(
  error: any,
): error is { message: string; cause?: { message: string } } {
  return (
    error instanceof Error &&
    (error.hasOwnProperty("cause") || error.message.includes("D1_"))
  );
}

export const errorSchema = z.object({
  error: z.string().openapi({ example: "Item not found" }),
  details: z.any(),
});

export async function wrapError<T, C extends SuccessCode, E extends ErrorCode>(
  fn: () => Promise<Result<T, C, E>>,
): Promise<Result<T, C, E | StatusInternalServerError>> {
  try {
    return await fn();
  } catch (error) {
    if (isD1Error(error)) {
      console.error("Database error:", error);
      return {
        ok: false,
        statusCode: 500,
        errorResponse: {
          error: "Database error",
          details: {}, // Avoid exposing database error details
        },
      };
    } else {
      console.error("Unknown error:", error);
      return {
        ok: false,
        statusCode: 500,
        errorResponse: {
          error: "Unknown error",
          details: {}, // Avoid exposing error details
        },
      };
    }
  }
}
