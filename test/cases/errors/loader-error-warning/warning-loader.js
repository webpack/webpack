module.exports = function(source) {
	this.emitWarning(this.query.substr(1));
	return source;
}
