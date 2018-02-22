module.exports = function(source) {
	var empty = null;
	var emptyError = new Error();
	this.emitWarning(empty);
	this.emitWarning(emptyError);
	this.emitError(empty);
	this.emitError(emptyError);
	throw "a string error";
	return source;
};
