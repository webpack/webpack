/** @type {import("../../../../").LoaderDefinition<string>} */
module.exports = function (source) {
	this.emitWarning(this.query.slice(1));
	return source;
};
