module.exports = function() {
	this.cacheable();
	if(!this.options.amd) return "/* empty to return {} */";
	return "module.exports = " + JSON.stringify(this.options.amd);
}