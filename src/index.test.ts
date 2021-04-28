import { describe, expect, it } from '@jest/globals';
import run from './index';

describe('git-changesets', () => {
    it('should exist', () => {
        expect(run).toBeTruthy();
    });
});
