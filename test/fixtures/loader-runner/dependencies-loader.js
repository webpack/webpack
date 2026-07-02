module.exports = function (source) {
	this.clearDependencies();
	this.addDependency("a");
	this.addDependency("b");
	this.addContextDependency("c");
	this.addMissingDependency("d");
	return (
		source +
		"\n" +
		JSON.stringify(this.getDependencies()) +
		JSON.stringify(this.getContextDependencies()) +
		JSON.stringify(this.getMissingDependencies())
	);
};
