import { ToolResponse, ErrorDetails } from '../types';

/**
 * Canonical error code catalog for ToolResponse.errorCode.
 * Uses string constants (not enum) to allow per-site extension without schema migration.
 *
 * Convention: UPPER_SNAKE_CASE. Prefer a generic code + `details.*` over a specific
 * enum member when the taxonomy is still evolving. See FEATURE_GUIDE_CN.md Appendix B.
 */
export const ERROR_CODES = {
    /** Requested asset / node / prefab / component was not found. */
    NOT_FOUND: 'NOT_FOUND',
    /** Caller-supplied params failed validation (missing/invalid type/out of range). */
    INVALID_PARAMS: 'INVALID_PARAMS',
    /** Operation requires a state that is not satisfied (no scene open, not in edit mode, scene dirty). */
    INVALID_STATE: 'INVALID_STATE',
    /** Editor.Message.request rejected or threw. */
    EDITOR_API_ERROR: 'EDITOR_API_ERROR',
    /** Filesystem / meta IO failure. */
    IO_ERROR: 'IO_ERROR',
    /** Awaited editor operation exceeded its timeout. */
    OPERATION_TIMEOUT: 'OPERATION_TIMEOUT',
    /** Editor refused the operation (permissions / locked asset). */
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    /** Fallback when the cause cannot be classified. */
    UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES] | string;

/**
 * Build a structured error ToolResponse.
 *
 * Keeps the legacy `error: string` field populated for backward compatibility with
 * clients that only know the old shape, while adding `errorCode` + `details` for
 * programmatic error handling by AI agents.
 */
export function createErrorResponse(
    errorCode: ErrorCode,
    message: string,
    details?: ErrorDetails
): ToolResponse {
    return {
        success: false,
        error: message,
        errorCode,
        ...(details !== undefined ? { details } : {})
    };
}
