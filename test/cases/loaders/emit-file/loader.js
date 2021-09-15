/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (content) {
	this.emitFile("extra-file.js", content);
	return "";
};
