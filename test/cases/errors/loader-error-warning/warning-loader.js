/** @type {import("../../../../").LoaderDefinition<string>} */
module.exports = function (source) {
	//@ts-expect-error warnings must be Errors, string is not recommended and should lead to type error
	this.emitWarning(this.query.substr(1));
	return source;
};
