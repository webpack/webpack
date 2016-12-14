module.exports = function(source) {
	this.emitError(this.query.substr(1));
	return source;
}
