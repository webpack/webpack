module.exports = function (source) {
	this.cacheable(false);
	// second call must not record a duplicate reason
	this.cacheable(false);
	return source + "-not-cacheable";
};
