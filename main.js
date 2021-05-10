const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/es5/build/pdf.js');
const Minimatch = require('minimatch').Minimatch;
const wordsCount = require('words-count').default;

async function main() {
    // Read all input parameters and check if their values are correct
    const repositoryPath = core.getInput('repository-path'),
          fileGlob = new Minimatch(core.getInput('file-glob')),
          token = core.getInput('token'),
          minWordCount = getNumberInput('min-word-count'),
          maxWordCount = getNumberInput('max-word-count'),
          reportActionStatus = getBooleanInput('report-action-status'),
          requireAllPass = getBooleanInput('require-all-pass'),
          reportPrComment = getBooleanInput('report-pr-comment');

    const context = github.context;

    if (context.eventName != 'pull_request')
        throw new Error('This action works only on pull requests');

    const pull_request = context.payload.pull_request;

    const octokit = github.getOctokit(token);

    // Retrieve a list of files (name and path) that have been added or changed by the pull request
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
                    path: path.join(process.env.GITHUB_WORKSPACE, repositoryPath, file.filename)
                };
            })
    ));

    let comment = '## PDF Essay Checker Report\n\n';

    // Check the word count of each of the files
    for (let file of files) {
        core.startGroup(`Checking ${file.name}`);
        comment += `### ${file.name}\n\n`;
        file.wordCount = 0;

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

        file.minWordCountPass = minWordCount < 0 || minWordCount <= file.wordCount;
        file.maxWordCountPass = maxWordCount < 0 || maxWordCount >= file.wordCount;

        core.info(`Word count: ${file.wordCount}`);
        comment += `Word count: **${file.wordCount}**`;

        if (minWordCount >= 0 || maxWordCount >= 0) {
            comment += ' (';

            if (minWordCount >= 0) {
                core.info(`Minimum word count check: ${file.minWordCountPass ? '✔️ PASS' : '❌ FAIL'}`);
                comment += `minimum: ${file.minWordCountPass ? '**✔️ PASS**' : '**❌ FAIL**'}`;
            }

            if (minWordCount >= 0 && maxWordCount >= 0)
                comment += ', ';

            if (maxWordCount >= 0) {
                core.info(`Maximum word count check: ${file.maxWordCountPass ? '✔️ PASS' : '❌ FAIL'}`);
                comment += `maximum: ${file.maxWordCountPass ? '**✔️ PASS**' : '**❌ FAIL**'}`;
            }

            comment += ')';
        }

        comment += '\n\n';

        core.endGroup();
    }

    // Leave comment on the pull request if desired
    if (reportPrComment)
        octokit.issues.createComment({
            ...context.repo,
            issue_number: pull_request.number,
            body: comment
        });

    // Fail the action if desired and not passed
    if (reportActionStatus) {
        const passCount = files.reduce((count, file) => count + (file.minWordCountPass && file.maxWordCountPass), 0);

        if (requireAllPass && passCount < files.length)
            core.setFailed('Some files failed word count checks');
        else if (!requireAllPass && passCount == 0)
            core.setFailed('No file passed word count checks');
    }
}

// Parses the contents of an input parameter as a number
function getNumberInput(param) {
    const value = parseFloat(core.getInput(param));

    if (isNaN(value))
        throw new Error(`Input '${param}' is not a valid number`);

    return value;
}

// Parses the contents of an input parameter as a boolean
function getBooleanInput(param) {
    const value = core.getInput(param).toLowerCase();;

    return value == 'true' || value == '1';
}

main().catch((error) => core.setFailed(error));
