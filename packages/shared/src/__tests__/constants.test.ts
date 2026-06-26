import { describe, it, expect } from 'vitest';
import { MODULES, MODULE_IDS, SOURCE_TYPES } from '../constants.js';

describe('module registry', () => {
  it('has unique module ids', () => {
    expect(new Set(MODULE_IDS).size).toBe(MODULE_IDS.length);
  });

  it('every module declares a path and phase', () => {
    for (const m of MODULES) {
      expect(m.path).toBeTruthy();
      expect(typeof m.phase).toBe('number');
    }
  });

  it('includes the core knowledge source types', () => {
    expect(SOURCE_TYPES).toContain('note');
    expect(SOURCE_TYPES).toContain('pdf');
    expect(SOURCE_TYPES).toContain('github_commit');
  });
});
