module.exports = function (source) {
	this.cacheable(false);
	this.clearDependencies();
	return source;
};
