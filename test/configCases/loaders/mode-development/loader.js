/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	return `module.exports = "${this.mode}";`;
};
