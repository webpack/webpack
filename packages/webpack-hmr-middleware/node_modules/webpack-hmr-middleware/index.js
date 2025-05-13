\
let lastHash;

/**
 * Checks if the current hash is already applied.
 * @param {string} currentHash 
 * @returns {boolean}
 */
function isUpToDate(currentHash) {
    return (lastHash || "").indexOf(currentHash) >= 0;
}

/**
 * Performs hot check using module.hot API.
 * @param {object} moduleHot - module.hot object from Webpack
 * @param {function} log - logging function
 * @param {string} currentHash - current hash value
 */
function applyHotCheck(moduleHot, log, currentHash) {
    if (!moduleHot) return;

    moduleHot.check(true).then((updatedModules) => {
        if (!updatedModules) {
            log(
                "warning",
                "[HMR] Cannot find update. " +
                (typeof window !== "undefined" ? "Need to do a full reload!" : "")
            );
        }
    });

    lastHash = currentHash;
}

module.exports = {
    isUpToDate,
    applyHotCheck,
};