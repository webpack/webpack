/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	const attributes = this._importAttributes;
	return `module.exports = ${JSON.stringify(attributes)};`;
};
