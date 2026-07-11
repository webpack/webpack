/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	// resource is derived after beforeLoaders, so the injected query is visible
	return `module.exports = ${JSON.stringify(this.resourceQuery)};`;
};
