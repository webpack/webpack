/** @type {import("../../../../types").LoaderDefinition<{ get(): string }>} */
module.exports.pitch = function (request) {
	return `
    var content = require(${stringifyRequest(this, `!!${request}`)});
    module.exports = content;
    `
};

function stringifyRequest(loaderContext, request) {
    return JSON.stringify(
      loaderContext.utils.contextify(
        loaderContext.context || loaderContext.rootContext,
        request
      )
    )
}