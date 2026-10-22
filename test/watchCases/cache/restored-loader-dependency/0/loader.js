const fs = require("fs");
const path = require("path");

// The module source never changes, only the file declared with addDependency.
/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function trackedLoader() {
	const tracked = path.resolve(__dirname, "tracked.txt");
	this.addDependency(tracked);
	return `module.exports = ${JSON.stringify(fs.readFileSync(tracked, "utf8").trim())};`;
};
