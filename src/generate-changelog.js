import fs from 'fs'
import path from 'path'
import { prepareRelease } from "./prepare-entries"
import { compareVersions } from './utils/versions'

export const generateChangelog = async (options) => {
    const parsedReleases = await prepareRelease({ dryRun: true })
    parsedReleases.releases.sort((a, b) => -compareVersions(a.info.version, b.info.version))

    let markdown = '# Changelog\n\n'

    markdown += 'All notable changes to this project will be documented in this file.\n\n'

    markdown += 'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), '
    markdown += 'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n'

    markdown += '## Unreleased\n\n'

    if (parsedReleases.unreleased && Object.keys(parsedReleases.unreleased).length > 0) {
        markdown = appendChanges(markdown, parsedReleases.unreleased)
    } else {
        markdown += '- No changes yet\n\n'
    }

    for (let i = 0; i < parsedReleases.releases.length; i++) {
        const release = parsedReleases.releases[i];

        markdown += `## ${release.info.version} - ${release.info.date}\n\n`
        markdown = appendChanges(markdown, release.changes)
    }
    if (options.dryRun) {
        console.length(markdown)
    } else {
        fs.writeFileSync(path.join(process.cwd(), 'CHANGELOG.md'), markdown)
    }
}

const appendChanges = (markdown, changes) => {
    if (changes && Object.keys(changes).length > 0) {
        for (let i = 0; i < Object.keys(changes).length; i++) {
            const key = Object.keys(changes)[i];
            markdown += `### ${toFirstLetterUppercase(key)}\n`

            for (let i = 0; i < changes[key].length; i++) {
                const change = changes[key][i];

                markdown += `- ${toFirstLetterUppercase(change.title)}\n`
            }
            markdown += '\n'
        }
    }

    return markdown
}

const toFirstLetterUppercase = (str) => {
    if (!str || str.trim().length == 0) return ''
    return `${str.charAt(0).toUpperCase()}${str.slice(1).toLocaleLowerCase()}`
}