/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	// `this.context` is the resource directory set by the loader-runner; a custom
	// `config.loader.context` must not override it (runner-field precedence)
	return `module.exports = ${JSON.stringify(this.context)};`;
};
