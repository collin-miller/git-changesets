import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { execSync } from 'child_process';

enum OutputFormat {
    SpaceDelimited = 'space-delimited',
    Csv = 'csv',
    Json = 'json',
}

enum FileStatus {
    Added = 'added',
    Modified = 'modified',
    Removed = 'removed',
    Renamed = 'renamed',
}

interface IGithubResponseFiles {
    status: string;
    filename: string;
}
interface IGithubResponse {
    status: number;
    data: { status: string; files: IGithubResponseFiles[] };
}

const setFormat = (elements: string[], outputFormat: OutputFormat) => {
    if (outputFormat === OutputFormat.SpaceDelimited) {
        return elements.join(' ');
    }
    if (outputFormat === OutputFormat.Csv) {
        return elements.join(',');
    }
    return JSON.stringify(elements);
};

const setOutput = (
    added: string[],
    modified: string[],
    removed: string[],
    renamed: string[],
    outputFormat: OutputFormat,
) => {
    const allFormatted = setFormat([...added, ...modified, ...removed, ...renamed], outputFormat);
    const addedFormatted = setFormat(added, outputFormat);
    const modifiedFormatted = setFormat(modified, outputFormat);
    const removedFormatted = setFormat(removed, outputFormat);
    const renamedFormatted = setFormat(renamed, outputFormat);
    const addedModifiedFormatted = setFormat([...added, ...modified], outputFormat);
    // Log the output values.
    core.info(`All: ${allFormatted}`);
    core.info(`Added: ${addedFormatted}`);
    core.info(`Modified: ${modifiedFormatted}`);
    core.info(`Removed: ${removedFormatted}`);
    core.info(`Renamed: ${renamedFormatted}`);
    core.info(`Added or modified: ${addedModifiedFormatted}`);

    // Set step output context.
    core.setOutput('all', allFormatted);
    core.setOutput('added', addedFormatted);
    core.setOutput('modified', modifiedFormatted);
    core.setOutput('removed', removedFormatted);
    core.setOutput('renamed', renamedFormatted);
    core.setOutput('added_modified', addedModifiedFormatted);
};

const parseCommit = async (commitSha: string): Promise<IGithubResponse> => {
    enum GitFileStatus {
        Added = 'A',
        Modified = 'M',
        Deleted = 'D',
        Renamed = 'R',
    }
    const files: IGithubResponseFiles[] = [];

    try {
        const result = await execSync(`git show --pretty="" --name-status ${commitSha}`).toString('utf-8');
        result.split('\n').forEach((element: string) => {
            const fileStatus: string = element.split('\t')[0];
            const fileName: string = element.split('\t')[1];
            if (fileStatus && fileName) {
                const data = {} as IGithubResponseFiles;
                data.filename = fileName;
                if (fileStatus === GitFileStatus.Added) {
                    data.status = FileStatus.Added;
                } else if (fileStatus === GitFileStatus.Modified) {
                    data.status = FileStatus.Modified;
                } else if (fileStatus === GitFileStatus.Deleted) {
                    data.status = FileStatus.Removed;
                } else if (fileStatus.startsWith(GitFileStatus.Renamed)) {
                    data.status = FileStatus.Renamed;
                }
                files.push(data as IGithubResponseFiles);
            }
        });
    } catch (err) {
        core.setFailed(`Exception raised while parsing commit ${commitSha}, message ${err.message}`);
    }
    return { status: 200, data: { files } } as IGithubResponse;
};

const run = async (): Promise<void> => {
    try {
        // Create GitHub client with the API token.
        const format = core.getInput('format', {
            required: true,
        }) as OutputFormat;

        // Ensure that the format parameter is set properly.
        if (!Object.values(OutputFormat).includes(format)) {
            core.setFailed(
                `Output format must be one of must be one of ${Object.values(OutputFormat).join(
                    ', ',
                )}, got '${format}'.`,
            );
        }

        // Debug log the payload.
        core.debug(`Payload keys: ${Object.keys(context.payload)}`);
        const client = getOctokit(core.getInput('token', { required: true }));

        // Get event name.
        const { eventName } = context;

        // Define the base and head commits to be extracted from the payload.
        let base: string;
        let head: string;

        if (eventName === 'pull_request') {
            base = context.payload.pull_request?.base?.ref;
            head = context.payload.pull_request?.head?.sha;
        } else if (eventName === 'push') {
            base = context.payload.before;
            head = context.payload.after;
        } else {
            base = '';
            head = '';
            core.setFailed(
                `Pull requests and pushes are the only supported event types. Event type: ${context.eventName}`,
            );
        }

        // Log the commits
        core.info(`Base commit: ${base}`);
        core.info(`Head commit: ${head}`);
        let response;
        // Ensure that the base and head properties are set on the payload.
        if (!base || !head) {
            core.setFailed(
                `The base and head commits are missing from the payload for this ${context.eventName} event.`,
            );
        } else if (base === '0000000000000000000000000000000000000000') {
            response = await parseCommit(head);
        } else {
            // https://developer.github.com/v3/repos/commits/#compare-two-commits
            response = await client.repos.compareCommits({
                base,
                head,
                owner: context.repo.owner,
                repo: context.repo.repo,
            });
        }

        // Ensure that the request was successful.
        if (response?.status !== 200) {
            core.setFailed(
                `The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${response?.status}, expected 200.`,
            );
        }

        const files = response?.data.files;

        const added = [] as string[];
        const modified = [] as string[];
        const removed = [] as string[];
        const renamed = [] as string[];
        files?.forEach((element) => {
            if (element.status === FileStatus.Added) {
                added.push(element.filename);
            } else if (element.status === FileStatus.Modified) {
                modified.push(element.filename);
            } else if (element.status === FileStatus.Removed) {
                removed.push(element.filename);
            } else if (element.status === FileStatus.Renamed) {
                renamed.push(element.filename);
            } else {
                core.setFailed(
                    `Invalid File Status '${element.status}', expected 'added', 'modified', 'removed', or 'renamed'. File causing violation ${element.filename}`,
                );
            }
            // If we're using the 'space-delimited' format and any of the filenames have a space in them,
            // then fail the step.
            if (format === OutputFormat.SpaceDelimited && element.filename.includes(' ')) {
                core.setFailed(
                    `Filenames cannot contain a space when using the 'space-delimited' option. Filename causing the violation '${element.filename}'`,
                );
            }
        });
        setOutput(added, modified, removed, renamed, format);
    } catch (error) {
        core.setFailed(error.message);
    }
};

export default run;
