/**
 * Unit tests for Error Book renumbering (ERR-001~ERR-012 consecutive)
 *
 * Verifies:
 * - Exactly 12 entries exist, numbered ERR-001 through ERR-012
 * - No gaps or duplicates in numbering
 * - Each file's internal id and aliases match its filename
 * - Content integrity: frontmatter structure is valid
 * - index.json remains frozen (unmodified)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ENTRIES_DIR = path.resolve(__dirname, '..', '..', '..', 'KI', 'Error_Book', 'entries');
const INDEX_PATH = path.resolve(__dirname, '..', '..', '..', 'KI', 'Error_Book', 'index.json');

// Read all entry files
const entryFiles = fs.readdirSync(ENTRIES_DIR)
    .filter(f => f.startsWith('ERR-') && f.endsWith('.md'))
    .sort();

// Helper: parse frontmatter from an entry file
function parseFrontmatter(filePath: string): Record<string, any> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const fm: Record<string, any> = {};
    let currentKey = '';
    let listValues: string[] = [];

    for (const line of match[1].split('\n')) {
        const kvMatch = line.match(/^(\w[\w_]*?):\s*(.*)$/);
        if (kvMatch) {
            // Save previous list if any
            if (currentKey && listValues.length > 0) {
                fm[currentKey] = listValues;
                listValues = [];
            }
            currentKey = kvMatch[1];
            const value = kvMatch[2].trim();
            if (value === '' || value === '[]') {
                fm[currentKey] = value === '[]' ? [] : undefined;
            } else {
                fm[currentKey] = value.replace(/^["']|["']$/g, '');
            }
        } else if (line.match(/^\s+-\s+(.*)$/)) {
            const item = line.match(/^\s+-\s+(.*)$/)![1].trim();
            listValues.push(item);
        }
    }
    // Save last list
    if (currentKey && listValues.length > 0) {
        fm[currentKey] = listValues;
    }

    return fm;
}

// Helper: extract ERR-XXX from filename
function extractId(filename: string): string {
    const match = filename.match(/^(ERR-\d{3})/);
    return match ? match[1] : '';
}

// ============================================================
// AC-1: Exactly 12 entries, ERR-001 through ERR-012, no gaps
// ============================================================

describe('AC-1: consecutive numbering ERR-001 to ERR-012', () => {

    it('should have exactly 12 entry files', () => {
        expect(entryFiles.length).toBe(12);
    });

    it('should start at ERR-001', () => {
        expect(extractId(entryFiles[0])).toBe('ERR-001');
    });

    it('should end at ERR-012', () => {
        expect(extractId(entryFiles[entryFiles.length - 1])).toBe('ERR-012');
    });

    it('should have no gaps in numbering', () => {
        const expected = Array.from({ length: 12 }, (_, i) =>
            `ERR-${String(i + 1).padStart(3, '0')}`
        );
        const actual = entryFiles.map(extractId);
        expect(actual).toEqual(expected);
    });

    it('should have no duplicate IDs', () => {
        const ids = entryFiles.map(extractId);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });
});

// ============================================================
// AC-2: Internal ID and aliases match filename
// ============================================================

describe('AC-2: internal id and aliases match filename', () => {

    for (const file of entryFiles) {
        const fileId = extractId(file);

        it(`${fileId}: frontmatter id should match filename`, () => {
            const fm = parseFrontmatter(path.join(ENTRIES_DIR, file));
            expect(fm.id).toBe(fileId);
        });

        it(`${fileId}: aliases should contain the correct ID`, () => {
            const fm = parseFrontmatter(path.join(ENTRIES_DIR, file));
            if (Array.isArray(fm.aliases)) {
                expect(fm.aliases).toContain(fileId);
            } else {
                expect(fm.aliases).toBe(fileId);
            }
        });
    }
});

// ============================================================
// AC-3: Content integrity — frontmatter structure valid
// ============================================================

describe('AC-3: frontmatter structure integrity', () => {

    const requiredFields = ['id', 'type', 'errorCode', 'severity', 'status', 'recurrence', 'firstSeen', 'prevention'];

    for (const file of entryFiles) {
        const fileId = extractId(file);

        it(`${fileId}: should have all required frontmatter fields`, () => {
            const fm = parseFrontmatter(path.join(ENTRIES_DIR, file));
            for (const field of requiredFields) {
                expect(fm[field], `missing field: ${field}`).toBeDefined();
            }
        });

        it(`${fileId}: severity should be valid`, () => {
            const fm = parseFrontmatter(path.join(ENTRIES_DIR, file));
            expect(['critical', 'high', 'medium', 'low']).toContain(fm.severity);
        });

        it(`${fileId}: status should be valid`, () => {
            const fm = parseFrontmatter(path.join(ENTRIES_DIR, file));
            expect(['open', 'resolved', 'recurring']).toContain(fm.status);
        });

        it(`${fileId}: should not reference any old (pre-renumber) ID in frontmatter`, () => {
            const content = fs.readFileSync(path.join(ENTRIES_DIR, file), 'utf-8');
            const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (fmMatch) {
                const frontmatter = fmMatch[1];
                // Should not contain old IDs that were renumbered
                // Old IDs that no longer exist: ERR-005(was ERR-006 slug), check no stale refs
                const oldIds = ['ERR-013', 'ERR-014', 'ERR-015', 'ERR-016', 'ERR-017', 'ERR-018', 'ERR-019'];
                for (const oldId of oldIds) {
                    expect(frontmatter).not.toContain(oldId);
                }
            }
        });
    }
});

// ============================================================
// AC-4: index.json remains frozen
// ============================================================

describe('AC-4: index.json frozen and unmodified', () => {

    it('index.json should exist', () => {
        expect(fs.existsSync(INDEX_PATH)).toBe(true);
    });

    it('index.json should have frozen flag set to true', () => {
        const content = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
        expect(content._meta.frozen).toBe(true);
    });

    it('index.json frozenNote should indicate Obsidian migration', () => {
        const content = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
        expect(content._meta.frozenNote).toContain('Obsidian');
    });
});

// ============================================================
// Slug preservation: filenames keep original slugs
// ============================================================

describe('Slug preservation: renumbered files keep original slugs', () => {

    const expectedSlugs: Record<string, string> = {
        'ERR-001': 'unhandled-rejection',
        'ERR-002': 'python-modify-cocos-prefab',
        'ERR-003': 'buyview-mask-debug-failure',
        'ERR-004': 'mcp-prefab-layer-ui2d',
        'ERR-005': 'python-json-dump-prefab-id-shift',
        'ERR-006': 'mcp-port-conflict-not-persisted',
        'ERR-007': 'obsidian-mcp-wrong-config-path',
        'ERR-008': 'push-without-version-check',
        'ERR-009': 'overengineered-scroll-recycling',
        'ERR-010': 'blindly-copy-without-analysis',
        'ERR-011': 'error-book-duplicate-id',
        'ERR-012': 'chinese-filename-in-assets',
    };

    for (const [id, slug] of Object.entries(expectedSlugs)) {
        it(`${id} should have slug "${slug}"`, () => {
            const expectedFile = `${id}__${slug}.md`;
            expect(entryFiles).toContain(expectedFile);
        });
    }
});
