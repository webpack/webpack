/** @type {import("../../../../").LoaderDefinition<string>} */
module.exports = function (source) {
	this.emitError(this.query.slice(1));
	return source;
};
