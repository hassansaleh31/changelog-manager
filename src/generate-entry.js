import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import inquirer from 'inquirer'
import { getUsername } from './utils/git-utils'

const TYPES = [
    { value: 'added', name: 'New feature' },
    { value: 'fixed', name: 'Bug fix' },
    { value: 'changed', name: 'Feature change' },
    { value: 'deprecated', name: 'New deprecation' },
    { value: 'removed', name: 'Feature removal' },
    { value: 'security', name: 'Security fix' },
    { value: 'performance', name: 'Performance improvement' },
    { value: 'other', name: 'Other' }
]

async function promptForMissingOptions(options) {
    const defaultType = 'changed';

    const questions = [];

    if (!options.title) {
        questions.push({
            type: 'input',
            name: 'title',
            message: 'Enter a title for the entry: ',
            validate: (input) => {
                return new Promise((resolve, reject) => {
                    if (!input || input.trim() == '') {
                        reject('You need to provide a title')
                        return;
                    }
                    resolve(true)
                })
            }
        })
    }

    if (!options.type) {
        questions.push({
            type: 'list',
            name: 'type',
            message: 'Choose which change type to use: ',
            choices: TYPES,
            default: defaultType,
        });
    }

    if (!options.issue) {
        questions.push({
            type: 'number',
            name: 'issue',
            message: 'Enter the issue ID: ',
            validate: (input) => {
                return new Promise((resolve, reject) => {
                    if (typeof input !== 'number' || isNaN(input)) {
                        reject('You need to provide a number')
                        return;
                    }
                    resolve(true)
                })
            }
        });
    }

    const answers = await inquirer.prompt(questions);
    return {
        ...options,
        type: options.type || answers.type,
        issue: options.issue || answers.issue,
        title: options.title || answers.title
    };
}

export const generateEntry = async (options) => {
    options = await promptForMissingOptions(options);
    const author = await getUsername()

    const entryData = YAML.stringify({
        title: options.title,
        author: author,
        issue: options.issue,
        type: options.type
    })
    const pathToEntries = path.join(process.cwd(), 'changelogs', 'unreleased')

    // Test the entry by only logging it to the console if in dry-run mode
    if (options.dryRun) {
        console.log(x)
        return
    }

    // Make sure the unreleased folder exists
    if (!fs.existsSync(pathToEntries)) {
        console.log('Changelogs directory does not exist. Creating directory ...')
        fs.mkdirSync(pathToEntries, { recursive: true })
        console.log('Changelogs directory created successfully')
    }

    const pathToEntry = path.join(pathToEntries, `RM-${options.issue}.yml`)

    // TODO: check if an older entry with same redmine and title exists

    // Check if the entry already exists in the unreleased folder
    if (fs.existsSync(pathToEntry)) {
        if (!options.force) {
            console.error(`The following entry already exists ${pathToEntry}`)
            console.log('Use --force to replace it')
            throw `The following entry already exists ${pathToEntry}`
        }
    }

    fs.writeFileSync(pathToEntry, entryData)
}