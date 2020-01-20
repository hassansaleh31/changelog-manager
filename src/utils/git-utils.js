import execa from 'execa'

export const getBranchName = async () => {
    const { stdout } = await execa('git', ['branch'])
    const branches = stdout.split('\n')

    const branchName = branches.find(branch => branch.match(/^\* \D*/))

    if (branchName) {
        return branchName.slice(2)
    }

    throw 'Failed to fetch branch name from git'
}

export const checkoutBranch = async (branchName, createNew = false) => {
    if (createNew) {
        await execa('git', ['checkout', '-b', branchName])
    } else {
        await execa('git', ['checkout', branchName])
    }
}

export const addChanges = async (files, all = false) => {
    if (all) {
        await execa('git', ['add', '-A'])
    } else {
        await execa('git', ['add', files.join(' ')])
    }
}

export const commit = async (message, addAll = false) => {
    if (addAll) {
        await addChanges([], true)
    }
    await execa('git', ['commit', '-m', message])
}