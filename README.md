# PDF Essay Checker Action

This GitHub action checks PDF files (for example, essays) that are submitted to a repository in a pull request, to see whether their word counts are within set limits.

[PDF.js](https://github.com/mozilla/pdf.js) is used to parse the text of the detected PDF files, after which [words-count](https://www.npmjs.com/package/words-count) is applied for accurate multi-language word counting.

# Input Parameters

The following is a list of all input parameters that are supported by the PDF Essay Checker action. These can be included in the `with` option of the workflow configuration to override the given defaults.

## repository-path

Default: `''`

The relative path under $GITHUB_WORKSPACE where the repository is checked out. This should be the same as the path supplied to the [Checkout](https://github.com/actions/checkout) action, if it is used. Generally, changing this value should not be necessary.

## file-glob

Default: `**/*.pdf`

The pattern to match changed files to for them to be considered. This pattern is relative to the repository path. For more information on the syntax, see [minimatch](https://www.npmjs.com/package/minimatch). It is recommended to use the same pattern to limit the triggering events for the workflow by using the `on.pull_request.paths` setting (for an example, see the example usage below).

## token

Default: `${{ github.token }}`

The personal access token that is used to interact with the GitHub API (to provide status or comments to the pull request). Generally, this token is provided by the Actions environment, and does not need to be modified (unless, for example, you wish that generated comments appear under a diferent user). If you do choose to modify this value, make sure to use an [encrypted secret](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets).

## min-word-count

Default: `-1`

Defines the minimum word count that is required to pass the checks. A value of `-1` skips the minimum word count check.

## max-word-count

Default: `-1`

Defines the maximum word count that is required to pass the checks. A value of `-1` skips the maximum word count check.

## report-action-status

Default: `true`

Whether to report the final result as the status (exit code) of the action. When set to `false`, the action will succeed regardless of whether the word count checks have passed.

## require-all-pass

Default: `false`

When set to `true`, all matched files are required to pass the checks for a final passing result. When set to `false`, only one matched file is required to pass the checks.

## report-pr-comment

Default: `false`

Whether to report the results as a comment on the pull request. This comment will contain word counts for each of the files, as well as whether the word count checks were passed.

# Example Usage

To use this action, create a workflow file in the `.github/workflows` file of your repository (named `pdf-essay-checker.yml`, for example). See [here](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions) for more information about the syntax of these workflow configuration files. The following is an example configuration that executes PDF Essay Checker.

```yaml
name: PDF Essay Checker

on:
  # Only pull_request is currently supported as a triggering event
  pull_request:
    # Only run the action when the path matches
    paths:
    - examples/**/*.pdf
    # Only run the action when a pull request is opened or commits are added
    types:
    - opened
    - synchronize

jobs:
  pdf-essay-checker:
    runs-on: ubuntu-latest
    name: PDF Essay Checker
    steps:
      # Checkout the repository before running the action
    - name: Checkout
      uses: actions/checkout@v2
      # Run the PDF Essay Checker action.
    - name: PDF Essay Checker Action
      uses: atema/pdf-essay-checker-action@main
      # Parameters supplied to the action (see the previous section for all options)
      with:
        file-glob: examples/**/*.pdf
        min-word-count: 1750
        max-word-count: 2250
```
