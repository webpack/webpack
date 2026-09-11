const fs = require("fs");
const path = require("path");

const fileDep = path.resolve(__dirname, "tracked.txt");

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function () {
	this.addDependency(fileDep);
	const content = fs.readFileSync(fileDep, "utf8").trim();
	return `module.exports = ${JSON.stringify(content)};`;
};
