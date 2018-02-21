module.exports = function(source) {
	this.emitWarning(new Error("a warning from loader"));
	this.emitError(new Error("a error from loader"));
	return source;
};
