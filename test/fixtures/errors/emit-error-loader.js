/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	this.emitWarning(new Error("this is a warning"));
	this.emitError(new Error("this is an error"));
	return source;
};
