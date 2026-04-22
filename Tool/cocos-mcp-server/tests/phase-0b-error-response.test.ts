/**
 * Phase 0B — structured errorCode + ErrorDetails on ToolResponse
 *
 * Coverage:
 * - createErrorResponse output shape
 * - ERROR_CODES catalog completeness
 * - Backward-compat (legacy `error: string` field preserved)
 * - prefab-tools.ts retrofit site count
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createErrorResponse, ERROR_CODES } from '../source/utils/error-response';

const SOURCE_DIR = path.join(__dirname, '..', 'source');
const prefabToolsSrc = fs.readFileSync(path.join(SOURCE_DIR, 'tools', 'prefab-tools.ts'), 'utf-8');
const typesSrc = fs.readFileSync(path.join(SOURCE_DIR, 'types', 'index.ts'), 'utf-8');

describe('Phase 0B: ERROR_CODES catalog', () => {
    it('must export the 6 required canonical codes', () => {
        expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
        expect(ERROR_CODES.INVALID_PARAMS).toBe('INVALID_PARAMS');
        expect(ERROR_CODES.INVALID_STATE).toBe('INVALID_STATE');
        expect(ERROR_CODES.EDITOR_API_ERROR).toBe('EDITOR_API_ERROR');
        expect(ERROR_CODES.IO_ERROR).toBe('IO_ERROR');
        expect(ERROR_CODES.UNKNOWN).toBe('UNKNOWN');
    });

    it('should also include the extended codes', () => {
        expect(ERROR_CODES.OPERATION_TIMEOUT).toBe('OPERATION_TIMEOUT');
        expect(ERROR_CODES.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
    });

    it('all codes are UPPER_SNAKE_CASE strings', () => {
        const codes = Object.values(ERROR_CODES);
        for (const code of codes) {
            expect(code).toMatch(/^[A-Z][A-Z_]*[A-Z]$/);
        }
    });

    it('catalog has at least 8 entries (matches ERROR_CODES initial set per audit §4.3)', () => {
        expect(Object.keys(ERROR_CODES).length).toBeGreaterThanOrEqual(8);
    });
});

describe('Phase 0B: createErrorResponse()', () => {
    it('returns success=false', () => {
        const r = createErrorResponse(ERROR_CODES.NOT_FOUND, 'missing');
        expect(r.success).toBe(false);
    });

    it('sets both errorCode (machine) and error (legacy human) fields', () => {
        const r = createErrorResponse(ERROR_CODES.INVALID_PARAMS, 'bad input');
        expect(r.errorCode).toBe('INVALID_PARAMS');
        expect(r.error).toBe('bad input');
    });

    it('omits details when not provided (no undefined noise)', () => {
        const r = createErrorResponse(ERROR_CODES.UNKNOWN, 'x');
        expect(r).not.toHaveProperty('details');
    });

    it('propagates details as-is when provided', () => {
        const r = createErrorResponse(ERROR_CODES.IO_ERROR, 'parse failed', {
            suggestion: 'check git',
            relatedAssets: ['db://a.png']
        });
        expect(r.details).toEqual({
            suggestion: 'check git',
            relatedAssets: ['db://a.png']
        });
    });

    it('accepts arbitrary string codes (extensibility per audit §B.5)', () => {
        const r = createErrorResponse('PREFAB_EDIT_MODE_REQUIRED', 'open edit mode first');
        expect(r.errorCode).toBe('PREFAB_EDIT_MODE_REQUIRED');
        expect(r.success).toBe(false);
    });

    it('ErrorDetails supports free-form keys (extension pattern)', () => {
        const r = createErrorResponse(ERROR_CODES.NOT_FOUND, 'x', {
            customField: 'value',
            nested: { a: 1 }
        } as any);
        expect((r.details as any).customField).toBe('value');
        expect((r.details as any).nested).toEqual({ a: 1 });
    });
});

describe('Phase 0B: ToolResponse type has new optional fields', () => {
    it('types/index.ts declares ErrorDetails interface', () => {
        expect(typesSrc).toContain('export interface ErrorDetails');
    });

    it('types/index.ts ToolResponse has errorCode? field', () => {
        expect(typesSrc).toMatch(/errorCode\?:\s*string/);
    });

    it('types/index.ts ToolResponse has details? field', () => {
        expect(typesSrc).toMatch(/details\?:\s*ErrorDetails/);
    });
});

describe('Phase 0B: prefab-tools.ts retrofit (canonical sites)', () => {
    it('imports createErrorResponse + ERROR_CODES from utils', () => {
        expect(prefabToolsSrc).toContain("from '../utils/error-response'");
        expect(prefabToolsSrc).toMatch(/import\s*{[^}]*createErrorResponse[^}]*}/);
        expect(prefabToolsSrc).toMatch(/import\s*{[^}]*ERROR_CODES[^}]*}/);
    });

    it('has at least 7 createErrorResponse call sites (1 import line + 6+ retrofits)', () => {
        const matches = prefabToolsSrc.match(/createErrorResponse/g);
        expect(matches).not.toBeNull();
        // 1 import line + 7 retrofit sites = 8
        expect(matches!.length).toBeGreaterThanOrEqual(7);
    });

    it('uses NOT_FOUND for prefab-not-found scenarios', () => {
        expect(prefabToolsSrc).toContain('ERROR_CODES.NOT_FOUND');
    });

    it('uses INVALID_PARAMS for missing-path scenarios', () => {
        expect(prefabToolsSrc).toContain('ERROR_CODES.INVALID_PARAMS');
    });

    it('uses IO_ERROR for JSON parse / meta read failures', () => {
        expect(prefabToolsSrc).toContain('ERROR_CODES.IO_ERROR');
    });

    it('uses INVALID_STATE for disabled-native-api scenarios', () => {
        expect(prefabToolsSrc).toContain('ERROR_CODES.INVALID_STATE');
    });
});
