/** @typedef {import("../../../../types").LoaderDefinition} LoaderDefinition */
/** @typedef {import("../../../../types").LoaderContext<{}>} LoaderContext */

/**
 * @type {LoaderDefinition}
 */
module.exports.pitch = function (request) {
	return `
    var content = require(${stringifyRequest(this, `!!${request}`)});
    module.exports = content;
    `
};

/**
 * @param {LoaderContext} loaderContext loaderContext
 * @param {string} request request
 * @returns {string} stringified request
 */
function stringifyRequest(loaderContext, request) {
    return JSON.stringify(
      loaderContext.utils.contextify(
        loaderContext.context || loaderContext.rootContext,
        request
      )
    )
}
