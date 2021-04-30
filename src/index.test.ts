import { describe, expect, it } from '@jest/globals';
import * as process from 'process';
import * as path from 'path';
import run from './index';
import * as github from '@actions/github';
import * as core from '@actions/core';
import nock from 'nock';

import cp from 'child_process';

const originalGitHubWorkspace = process.env['GITHUB_WORKSPACE'];
const gitHubWorkspace = path.resolve('/checkout-tests/workspace');

// Shallow clone original @actions/github context
let originalContext = { ...github.context };

describe('git-changesets', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });
    beforeEach(() => {
        jest.spyOn(core, 'error').mockImplementation(jest.fn());
        jest.spyOn(core, 'warning').mockImplementation(jest.fn());
        jest.spyOn(core, 'info').mockImplementation(jest.fn());
        jest.spyOn(core, 'debug').mockImplementation(jest.fn());
        jest.spyOn(core, 'setOutput').mockImplementation(jest.fn());
        jest.spyOn(core, 'setFailed').mockImplementation(jest.fn());
        // Mock github context
    });
    afterAll(() => {
        // Restore GitHub workspace
        delete process.env['GITHUB_WORKSPACE'];
        if (originalGitHubWorkspace) {
            process.env['GITHUB_WORKSPACE'] = originalGitHubWorkspace;
        }

        // Restore @actions/github context
        github.context.ref = originalContext.ref;
        github.context.sha = originalContext.sha;

        // Restore
        jest.restoreAllMocks();
    });

    it('should exist', () => {
        expect(run).toBeTruthy();
    });
    describe('pull_request events', () => {
        beforeEach(() => {
            // Mock error/warning/info/debug
            jest.spyOn(github.context, 'repo', 'get').mockReturnValue({
                owner: 'some-owner',
                repo: 'some-repo',
            });
            github.context.payload.pull_request = {
                number: 123,
                base: { ref: 'refs/heads/some-ref' },
                head: { sha: '1234567890123456789012345678901234567890' },
            };
            github.context.eventName = 'pull_request';
            jest.spyOn(github, 'getOctokit');
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });
        it('test runs successfully', async () => {
            // Set Up
            // Mock getInput
            jest.spyOn(core, 'getInput')
                .mockImplementationOnce(() => {
                    return 'space-delimited';
                })
                .mockImplementationOnce(() => {
                    return 'some-token';
                });
            nock('https://api.github.com')
                .get((uri) => uri.includes('/repos/some-owner/some-repo/compare'))
                .reply(200, {
                    status: 200,
                    files: [
                        { status: 'added', filename: 'file1' },
                        { status: 'modified', filename: 'file2' },
                        { status: 'removed', filename: 'file3' },
                        { status: 'renamed', filename: 'file4' },
                    ],
                });

            // Execute
            await run();
            // Assert
            expect(core.getInput).toHaveBeenCalledTimes(2);
            expect(core.error).toHaveBeenCalledTimes(0);

            expect(core.setOutput).toHaveBeenNthCalledWith(1, 'all', 'file1 file2 file3 file4');
            expect(core.setOutput).toHaveBeenNthCalledWith(2, 'added', 'file1');
            expect(core.setOutput).toHaveBeenNthCalledWith(3, 'modified', 'file2');
            expect(core.setOutput).toHaveBeenNthCalledWith(4, 'removed', 'file3');
            expect(core.setOutput).toHaveBeenNthCalledWith(5, 'renamed', 'file4');
            expect(core.setOutput).toHaveBeenNthCalledWith(6, 'added_modified', 'file1 file2');
        });
        it('test creates csv delimited', async () => {
            // Set Up
            jest.spyOn(core, 'getInput')
                .mockImplementationOnce(() => {
                    return 'csv';
                })
                .mockImplementationOnce(() => {
                    return 'some-token';
                });
            nock('https://api.github.com')
                .get((uri) => uri.includes('/repos/some-owner/some-repo/compare'))
                .reply(200, {
                    status: 200,
                    files: [
                        { status: 'added', filename: 'file1' },
                        { status: 'modified', filename: 'file2' },
                        { status: 'removed', filename: 'file3' },
                        { status: 'renamed', filename: 'file4' },
                    ],
                });

            // Execute
            await run();
            // Assert
            expect(core.getInput).toHaveBeenCalledTimes(2);
            expect(core.error).toHaveBeenCalledTimes(0);

            expect(core.setOutput).toHaveBeenNthCalledWith(1, 'all', 'file1,file2,file3,file4');
            expect(core.setOutput).toHaveBeenNthCalledWith(2, 'added', 'file1');
            expect(core.setOutput).toHaveBeenNthCalledWith(3, 'modified', 'file2');
            expect(core.setOutput).toHaveBeenNthCalledWith(4, 'removed', 'file3');
            expect(core.setOutput).toHaveBeenNthCalledWith(5, 'renamed', 'file4');
            expect(core.setOutput).toHaveBeenNthCalledWith(6, 'added_modified', 'file1,file2');
        });
        it('test creates json output', async () => {
            // Set Up
            jest.spyOn(core, 'getInput')
                .mockImplementationOnce(() => {
                    return 'json';
                })
                .mockImplementationOnce(() => {
                    return 'some-token';
                });
            nock('https://api.github.com')
                .get((uri) => uri.includes('/repos/some-owner/some-repo/compare'))
                .reply(200, {
                    status: 200,
                    files: [
                        { status: 'added', filename: 'file1' },
                        { status: 'modified', filename: 'file2' },
                        { status: 'removed', filename: 'file3' },
                        { status: 'renamed', filename: 'file4' },
                    ],
                });

            // Execute
            await run();
            // Assert
            expect(core.getInput).toHaveBeenCalledTimes(2);
            expect(core.error).toHaveBeenCalledTimes(0);

            expect(core.setOutput).toHaveBeenNthCalledWith(1, 'all', '["file1","file2","file3","file4"]');
            expect(core.setOutput).toHaveBeenNthCalledWith(2, 'added', '["file1"]');
            expect(core.setOutput).toHaveBeenNthCalledWith(3, 'modified', '["file2"]');
            expect(core.setOutput).toHaveBeenNthCalledWith(4, 'removed', '["file3"]');
            expect(core.setOutput).toHaveBeenNthCalledWith(5, 'renamed', '["file4"]');
            expect(core.setOutput).toHaveBeenNthCalledWith(6, 'added_modified', '["file1","file2"]');
        });
        it('should fail with a bad response from Github', async () => {
            // Set Up
            // Mock getInput
            jest.spyOn(core, 'getInput')
                .mockImplementationOnce(() => {
                    return 'space-delimited';
                })
                .mockImplementationOnce(() => {
                    return 'some-token';
                });
            nock('https://api.github.com')
                .get((uri) => uri.includes('/repos/some-owner/some-repo/compare'))
                .reply(500, {
                    status: 500,
                });
            // Execute
            await run();
            // Assert
            expect(core.getInput).toHaveBeenCalledTimes(2);
            expect(core.error).toHaveBeenCalledTimes(0);
            expect(core.setFailed).toHaveBeenCalledTimes(1);
            expect(core.setFailed).toHaveBeenCalledWith('{"status":500}');
        });
    });
    describe('push events', () => {
        beforeEach(() => {
            // Mock error/warning/info/debug
            jest.spyOn(github.context, 'repo', 'get').mockReturnValue({
                owner: 'some-owner',
                repo: 'some-repo',
            });
            github.context.payload = {
                before: '1234567890123456789012345678901234567890',
                after: '456789012345678901234567890123456789012',
            };

            github.context.eventName = 'push';
            jest.spyOn(github, 'getOctokit');
            // Mock getInput
            jest.spyOn(core, 'getInput')
                .mockImplementationOnce(() => {
                    return 'space-delimited';
                })
                .mockImplementationOnce(() => {
                    return 'some-token';
                });
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });
        it('should get the diff from a github api when base is populated', async () => {
            // Set Up

            nock('https://api.github.com')
                .get((uri) => uri.includes('/repos/some-owner/some-repo/compare'))
                .reply(200, {
                    status: 200,
                    files: [
                        { status: 'added', filename: 'file1' },
                        { status: 'modified', filename: 'file2' },
                        { status: 'removed', filename: 'file3' },
                        { status: 'renamed', filename: 'file4' },
                    ],
                });
            // Execute
            await run();
            // Assert
            expect(core.getInput).toHaveBeenCalledTimes(2);
            expect(core.error).toHaveBeenCalledTimes(0);
            expect(core.setOutput).toHaveBeenNthCalledWith(1, 'all', 'file1 file2 file3 file4');
            expect(core.setOutput).toHaveBeenNthCalledWith(2, 'added', 'file1');
            expect(core.setOutput).toHaveBeenNthCalledWith(3, 'modified', 'file2');
            expect(core.setOutput).toHaveBeenNthCalledWith(4, 'removed', 'file3');
            expect(core.setOutput).toHaveBeenNthCalledWith(5, 'renamed', 'file4');
            expect(core.setOutput).toHaveBeenNthCalledWith(6, 'added_modified', 'file1 file2');
        });

        it('should get the using the git cli', async () => {
            // Set Up
            github.context.payload.before = '0000000000000000000000000000000000000000';
            jest.spyOn(cp, 'execSync').mockReturnValueOnce(Buffer.from('A\tfile1\nM\tfile2\nD\tfile3\nM\tfile4\n'));

            // Execute
            await run();
            // Assert
            expect(core.getInput).toHaveBeenCalledTimes(2);
            expect(core.error).toHaveBeenCalledTimes(0);
            expect(cp.execSync).toHaveBeenLastCalledWith(
                'git show --pretty="" --name-status 456789012345678901234567890123456789012',
            );

            expect(core.setOutput).toHaveBeenNthCalledWith(1, 'all', 'file1 file2 file4 file3');
            expect(core.setOutput).toHaveBeenNthCalledWith(2, 'added', 'file1');
            expect(core.setOutput).toHaveBeenNthCalledWith(3, 'modified', 'file2 file4');
            expect(core.setOutput).toHaveBeenNthCalledWith(4, 'removed', 'file3');
            expect(core.setOutput).toHaveBeenNthCalledWith(5, 'renamed', '');
            expect(core.setOutput).toHaveBeenNthCalledWith(6, 'added_modified', 'file1 file2 file4');
        });
    });
});
