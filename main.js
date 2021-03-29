const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
    const repositoryPath = core.getInput('repository-path');
    const fileGlob = core.getInput('file-glob');
    const token = core.getInput('token');
    const minWordCount = getNumberInput("min-word-count");
    const maxWordCount = getNumberInput("max-word-count");

    const context = github.context;

    if (context.eventName != "pull_request")
        throw new Error("This action works only on pull requests");

    const pull_request = context.payload.pull_request;

    const octokit = github.getOctokit(token);

    const files = await octokit.paginate(
        octokit.pulls.listFiles.endpoint.merge({
            ...context.repo,
            pull_number: pull_request.number
        })
    );

    core.info(JSON.stringify(files, null, 2));
}


function getNumberInput(input) {
    const value = parseFloat(core.getInput(input));

    if (isNaN(value))
        throw new Error(`Input '${input}' is not a valid number`);

    return value;
}

main().catch((error) => core.setFailed(error.message));
