const path = require("path");
const directory = path.resolve(__dirname, "directory");

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function () {
	this.addContextDependency(directory);
	return `module.exports = ${Math.random()};`;
};
