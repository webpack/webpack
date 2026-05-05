const path = require("path");
const directory = path.resolve(__dirname, "dir-a");

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function () {
	this.addContextDependency(directory);
	return `module.exports = ${Math.random()};`;
};
