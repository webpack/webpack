/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	return `module.exports = ${JSON.stringify(source.trim())};`;
};
