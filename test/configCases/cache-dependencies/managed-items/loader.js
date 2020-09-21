const path = require("path");
module.exports = function (source) {
	this.addDependency(path.resolve(__dirname, "node_modules/package/extra.js"));
	this.addDependency(path.resolve(__dirname, "extra.js"));
	return source;
};
