const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
    const repositoryPath = core.getInput('repository-path');
    const fileGlob = core.getInput('file-glob');
    const token = core.getInput('token');
    const minWordCount = getNumberInput("min-word-count");
    const maxWordCount = getNumberInput("max-word-count");

    const context = github.context;
    const octokit = github.getOctokit(token);

    const commit = await octokit.git.getCommit({
        ...context.repo,
        commit_sha: context.sha
    });

    core.info(JSON.stringify(commit, null, 2));
}


function getNumberInput(input) {
    const value = parseFloat(core.getInput(input));

    if (isNaN(value))
        throw new Error(`Input '${input}' is not a valid number`);

    return value;
}

main().catch((error) => core.setFailed(error.message));
