import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import { getBranchName, addChanges } from './utils/git-utils'
import { generateEntry } from './generate-entry'
import inquirer from 'inquirer'

const promptForMissingOptions = async (options) => {
    // TODO: initialize missing options
    return options
}

export const prepareRelease = async (options) => {
    options = await promptForMissingOptions(options);
    const parsedReleases = await parseReleases(options)
    return parsedReleases
}

/**
 * Finds and parses the list of releases and their entries in the current directory
 */
const parseReleases = async (options) => {
    // Validate release branch
    const branchName = await getBranchName();
    if (!options.dryRun && !branchName.match(/^release-\D*/)) {
        console.error('The current branch is not a release branch.\nPlease make sure your branch name begins with release-')
        process.exit(1)
    }

    // Parse list of releases
    const pathToReleases = path.join(process.cwd(), 'changelogs')
    const releases = fs.readdirSync(pathToReleases)

    const parsedReleases = []
    let unreleased = []

    for (let i = 0; i < releases.length; i++) {
        const release = releases[i];

        // Read release entries
        const pathToEntries = path.join(pathToReleases, release)
        const entries = fs.readdirSync(pathToEntries)

        const releaseChanges = {}
        let releaseInfo

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            // Parse release entries
            const entryStr = fs.readFileSync(path.join(pathToEntries, entry))
            const entryData = YAML.parse(entryStr.toString())
            entryData.originalPath = path.join(pathToEntries, entry)

            if (entry.match(/^release-[\D-\d]*-info\.yml/)) {
                // TODO: validate release info data
                if (entryData['release-branch'] != branchName && !options.dryRun) {
                    console.info(`The version ${entryData['version']} was released on a different release branch`)
                    const answer = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirm',
                            message: `Do you want to move entries for ${entryData['version']} to unreleased`
                        }
                    ])
                    if (answer.confirm) {
                        console.info(`moving entries for ${entryData['version']} to unreleased`)
                        // 1. Stage all git changes
                        // 2. Load all the incomming entries to memmory
                        // 3. Delete the invalid version folder
                        // 4. Create the entries as unreleased
                        // 5. re-run the function recursively
                        addChanges(null, true)
                        await unreleaseVersion(path.join(pathToEntries, entry), pathToEntries)
                        return await parseReleases()
                    }
                }
                if (!entryData.version || !entryData.version.match(/\d{1,}\.\d{1,}\.\d{1,}/)) {
                    console.error(`Invalid version found in ${entry}`)
                    process.exit(1)
                }
                releaseInfo = entryData
            } else {
                // TODO: validate entry data
                if (!entryData.type || !entryData.title) {
                    console.error(`Invalid entry (${entry}): missing title or type`)
                    process.exit(1)
                } else if (!entryData.issue || isNaN(entryData.issue)) {
                    console.error(`Entry is missing issue id (${entry})`)
                    process.exit(1)
                }

                // Add entry to release changes
                if (!releaseChanges[entryData.type]) releaseChanges[entryData.type] = []
                releaseChanges[entryData.type].push(entryData)
            }
        }

        // Validate that a release info file exists
        if (!releaseInfo && release != 'unreleased') {
            console.error(`Invalid or missing relese info for ${release}`)
            console.error('Make sure the release info file follows the following pattern: release-{APP_NAME}-x.x.x-info.yml')
            process.exit(1)
        }

        if (release == 'unreleased') {
            unreleased = releaseChanges
        } else {
            parsedReleases.push({
                info: releaseInfo,
                changes: releaseChanges
            })
        }
    }

    return {
        unreleased,
        releases: parsedReleases
    }
}

const unreleaseVersion = async (infoFile, releaseFolder) => {
    const entries = fs.readdirSync(releaseFolder)

    const infoStr = fs.readFileSync(infoFile)
    const infoData = YAML.parse(infoStr.toString())

    const unreleasedEntries = []

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (path.join(releaseFolder, entry) == infoFile) continue

        const entryPath = path.join(releaseFolder, entry)
        const entryStr = fs.readFileSync(entryPath)
        const entryData = YAML.parse(entryStr.toString())

        if (entryData['release-branch'] == infoData['release-branch']) {
            try {
                await generateEntry(entryData)
                unreleasedEntries.push(entryPath)
            } catch (e) {
                // TODO: remove generated entries
            }
        }
    }

    unreleasedEntries.push(infoFile)
    deleteFiles(unreleasedEntries)
    rmDirIfEmpty(releaseFolder)
}

const deleteFiles = (files) => {
    files.forEach(file => {
        fs.unlinkSync(file)
    })
}

const rmDirIfEmpty = (dir) => {
    const files = fs.readdirSync(dir)
    if (files.length == 0) fs.rmdirSync(dir)
}