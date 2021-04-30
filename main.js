const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/es5/build/pdf.js');
const Minimatch = require('minimatch').Minimatch;
const wordsCount = require('words-count').default;

async function main() {
    // Read all parameters and check if their values are correct
    const repositoryPath = core.getInput('repository-path');
    const fileGlob = new Minimatch(core.getInput('file-glob'));
    const token = core.getInput('token');
    const minWordCount = getNumberInput('min-word-count');
    const maxWordCount = getNumberInput('max-word-count');
    const requireAllPass = getBooleanInput('require-all-pass');
    const reportActionPass = getBooleanInput('report-action-pass');
    const reportPrComment = getBooleanInput('report-pr-comment');

    const context = github.context;

    if (context.eventName != 'pull_request')
        throw new Error('This action works only on pull requests');

    const pull_request = context.payload.pull_request;

    const octokit = github.getOctokit(token);

    // Compile a list of files (name and path) that have been added or changed by the pull request
    const files = (await octokit.paginate(
        octokit.pulls.listFiles.endpoint.merge({
            ...context.repo,
            pull_number: pull_request.number
        }),
        (response) => response.data
            .filter((file) => file.status != 'removed' && fileGlob.match(file.filename))
            .map((file) => {
                return {
                    name: file.filename,
                    path: path.join(process.env.GITHUB_WORKSPACE, repositoryPath, file.filename),
                    wordCount: 0,
                    minWordCountPass: false,
                    minWordCountPass: false
                };
            })
    ));

    // Check the word count of each of the files
    for (let file of files) {
        core.startGroup(`Checking ${file.name}`);

        const doc = await pdfjs.getDocument(fs.readFileSync(file.path)).promise;

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const pageContent = await page.getTextContent({ normalizeWhitespace: true })

            let pageText = '';
            let lastY = 0;
            let lastFontName = '';

            for (let item of pageContent.items) {
                if ((lastY == item.transform[5] || pageText.endsWith("-")) && lastFontName == item.fontName)
                    pageText += item.str;
                else
                    pageText += ' ' + item.str;

                lastY = item.transform[5];
                lastFontName = item.fontName;
            }

            file.wordCount += wordsCount(pageText);
        }

        core.info(`Word count: ${file.wordCount}`);

        file.minWordCountPass = minWordCount == -1 || minWordCount <= file.wordCount;
        file.maxWordCountPass = minWordCount == -1 || minWordCount <= file.wordCount;

        core.endGroup();
    }

    core.info(JSON.stringify(files));
}

/**
 * Parses the contents of an input parameter as a number
 *
 * @param {string} param Name of the parameter
 * @returns {number} Parsed value of the parameter
 * @throws {Error} Value of the parameter must be parsable as a number
 */
function getNumberInput(param) {
    const value = parseFloat(core.getInput(param));

    if (isNaN(value))
        throw new Error(`Input '${param}' is not a valid number`);

    return value;
}

/**
 * Parses the contents of an input parameter as a boolean
 *
 * @param {string} param Name of the parameter
 * @returns {boolean} Parsed value of the parameter
 * @throws {Error} Value of the parameter must be parsable as a boolean
 */
function getBooleanInput(param) {
    const value = core.getInput(param).toLowerCase();;

    return value == 'true' || value == '1';
}

main().catch((error) => core.setFailed(error));
