const path = require("path");
const fileDep = path.resolve(__dirname, "tracked.txt");

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function () {
	this.addDependency(fileDep);
	return `module.exports = ${Math.random()};`;
};
