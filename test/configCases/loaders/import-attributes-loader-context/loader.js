/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	const attributes = this.importAttributes;
	return `module.exports = ${JSON.stringify(attributes)};`;
};
