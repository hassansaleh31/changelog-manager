export const compareVersions = (a, b) => {
    const aSplit = a.split('.')
    const bSplit = b.split('.')

    if (aSplit[0] != bSplit[0]) {
        return aSplit[0] - bSplit[0]
    }
    if (aSplit[1] != bSplit[1]) {
        return aSplit[1] - bSplit[1]
    }
    if (aSplit[2] != bSplit[2]) {
        return aSplit[2] - bSplit[2]
    }
}