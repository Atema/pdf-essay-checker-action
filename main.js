const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/es5/build/pdf.js');
const Minimatch = require("minimatch").Minimatch;
const wordsCount = require("words-count").default;

async function main() {
    const repositoryPath = core.getInput('repository-path') || '';
    const fileGlob = new Minimatch(core.getInput('file-glob'));
    const token = core.getInput('token');
    const minWordCount = getNumberInput("min-word-count");
    const maxWordCount = getNumberInput("max-word-count");

    const context = github.context;

    if (context.eventName != "pull_request")
        throw new Error("This action works only on pull requests");

    const pull_request = context.payload.pull_request;

    const octokit = github.getOctokit(token);

    const files = (await octokit.paginate(
        octokit.pulls.listFiles.endpoint.merge({
            ...context.repo,
            pull_number: pull_request.number
        }),
        (response) => response.data
            .filter((file) => file.status != "removed" && fileGlob.match(file.filename))
            .map((file) => {
                return {
                    name: file.filename,
                    path: path.join(process.env.GITHUB_WORKSPACE, repositoryPath, file.filename)
                };
            })
    ));

    for (let file of files) {
        core.startGroup(`Checking ${file.name}`);

        const doc = await pdfjs.getDocument(fs.readFileSync(file.path)).promise;

        let wc = 0;

        for (let i = 1; i <= doc.numPages; i++) {
            let pageText = "";
            let lastY = 0;

            (await (await doc.getPage(i)).getTextContent()).items.forEach((item) => {
                pageText += (lastY == item.transform[5] || pageText.endsWith("-")) ?
                    item.str :
                    '\n' + item.str;

                lastY = item.transform[5];
            });

            wc += wordsCount(pageText);
        }

        core.info(`Word count: ${wc}`);

        core.endGroup();
    }
}


function getNumberInput(input) {
    const value = parseFloat(core.getInput(input));

    if (isNaN(value))
        throw new Error(`Input '${input}' is not a valid number`);

    return value;
}

main().catch((error) => core.setFailed(error));
