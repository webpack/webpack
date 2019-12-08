module.exports = function(content) {
	this.setModuleType("javascript/auto");
	return "module.exports = " + JSON.stringify(content);
};
