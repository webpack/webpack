module.exports = function (source) {
	this.addDependency("loader.js");
	this.addDependency("../**/dir/*.js");
	this.addDependency("../**/file.js");
	this.addContextDependency(".");
	this.addMissingDependency("./missing1.js");
	this.addMissingDependency("missing2.js");
	this.addMissingDependency("missing3.js");
	this.addMissingDependency("missing4.js");
	return source;
};
