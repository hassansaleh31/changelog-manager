import arg from 'arg';
import inquirer from 'inquirer';
import { generateEntry } from './generate-entry';
import { prepareRelease } from './prepare-entries';
import { releaseChangelog } from './release-entries';
import { generateChangelog } from './generate-changelog';

const commands = [
    { value: 'generate', name: 'Generate a new changelog entry' },
    { value: 'prepare', name: 'Prepare and validate all entries (required after merging release branches together)' },
    { value: 'release', name: 'Create a new release and an updated CHANGELOG.md file' },
    { value: 'create', name: 'Just create the CHANGELOG.md file' }
]

function parseArgumentsIntoOptions(rawArgs) {
    const args = arg(
        {
            // Types
            '--force': Boolean,
            '--issue': Number,
            '--type': String,
            '--dry-run': Boolean,
            '--help': Boolean,

            // Aliases
            '-f': '--force',
            '-i': '--issue',
            '-t': '--type',
            '-d': '--dry-run',
            '-h': '--help',
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        command: args._[0],
        version: args._[1],
        force: args['--force'] || false,
        issue: args['--issue'],
        type: args['--type'],
        dryRun: args['--dry-run'] || false,
        help: args['--help'] || false
    };
}

async function promptForMissingOptions(options) {
    const defaultType = 'generate';

    const questions = [];

    if (!options.command || options.command.trim() == '') {
        questions.push({
            type: 'list',
            name: 'command',
            message: 'Select an action: ',
            choices: commands,
            default: defaultType
        })
    }

    const answers = await inquirer.prompt(questions);
    return {
        ...options,
        command: options.command || answers.command
    };
}

export async function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    options = await promptForMissingOptions(options);

    switch (options.command) {
        case ('generate'):
            generateEntry(options)
            break;
        case ('prepare'):
            prepareRelease(options)
            break;
        case ('release'):
            releaseChangelog(options)
            break
        case ('create'):
            generateChangelog(options)
            break
        default:
            console.error('Invalid command')
    }
}