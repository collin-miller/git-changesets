# git-changesets

[![Build and Test](https://github.com/collin-miller/git-changesets/actions/workflows/ci.yml/badge.svg)](https://github.com/collin-miller/git-changesets/actions/workflows/ci.yml)

## Github Actions Project

Obtain the list of changed files from a Github Pull Request or Push event. The outputs can be passed from a `step` as an input to supsequent event. You may see access the changed files from output names `all`, `added`, `modified`, `removed`, `renamed` and `added_modified`.

## How-to

You may reference the [action.yml](./action.yml) to view the interface specifications.

## Examples

```yaml
name: Example

on:
    pull_request:
    push:

jobs:
    job1:
        name: Example Job
        runs-on: ubuntu-latest
        steps:
            - id: changed_files
              name: git-changesets
              uses: collin-miller/git-changesets@v0.0.2
              with:
                  # Default format is 'csv'. Other valid options are 'space-delimited' and 'json'.
                  format: csv

            - name: Print steps context output
              run: |
                  echo 'All=${{ steps.changed_files.outputs.all }}'
                  echo 'Added=${{ steps.changed_files.outputs.added }}'
                  echo 'Modified=${{ steps.changed_files.outputs.modified }}'
                  echo 'Removed=${{ steps.changed_files.outputs.removed }}'
                  echo 'Renamed=${{ steps.changed_files.outputs.renamed }}'
                  echo 'Added/Modified=${{ steps.changed_files.outputs.added_modified }}'
```
