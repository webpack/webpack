module.exports = function (source) {
	this.cacheable(false);
	// resets the flag and the recorded reasons
	this.clearDependencies();
	this.addDependency(this.resourcePath);
	return source;
};
