import * as core from '@actions/core';
import github, { context } from '@actions/github';

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

const setFormat = (elements: string[], outputFormat: OutputFormat) => {
    if (outputFormat === OutputFormat.SpaceDelimited) {
        return elements.join(' ');
    } else if (outputFormat === OutputFormat.Csv) {
        return elements.join(',');
    } else {
        return JSON.stringify(elements);
    }
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
    const removedFormatted = setFormat(modified, outputFormat);
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

const run = async (): Promise<void> => {
    try {
        // Create GitHub client with the API token.
        const format = core.getInput('format', {
            required: true,
        }) as OutputFormat;

        // Ensure that the format parameter is set properly.
        if (Object.values(OutputFormat).includes(format)) {
            core.setFailed(
                `Output format must be one of must be one of ${Object.values(OutputFormat).join(
                    ', ',
                )}, got '${format}'.`,
            );
        }

        // Debug log the payload.
        core.debug(`Payload keys: ${Object.keys(context.payload)}`);
        const client = github.getOctokit(core.getInput('token', { required: true }));

        // Get event name.
        const eventName = context.eventName;

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

        // Ensure that the base and head properties are set on the payload.
        if (!base || !head) {
            core.setFailed(
                `The base and head commits are missing from the payload for this ${context.eventName} event.`,
            );
        }

        // https://developer.github.com/v3/repos/commits/#compare-two-commits
        const response = await client.repos.compareCommits({
            base,
            head,
            owner: context.repo.owner,
            repo: context.repo.repo,
        });

        // Ensure that the request was successful.
        if (response.status !== 200) {
            core.setFailed(
                `The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${response.status}, expected 200.`,
            );
        }

        // Ensure that the head commit is ahead of the base commit.
        if (response.data.status !== 'ahead') {
            core.setFailed(
                `The head commit for this ${context.eventName} event is not ahead of the base commit. ` +
                    "Please submit an issue on this action's GitHub repo.",
            );
        }
        const files = response.data.files;

        const added = [] as string[];
        const modified = [] as string[];
        const removed = [] as string[];
        const renamed = [] as string[];
        files?.forEach((element) => {
            if (element.status === FileStatus.Added) {
                added.push(element.filename);
            } else if (element.status == FileStatus.Modified) {
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
