const fs = require("fs");
const path = require("path");

/** @type {import("../../../../").LoaderDefinition<{ f(): any }>} */
module.exports = function(_) {
	// return the would-be output from SASS without needing the compiler as a dependency
	const transformed = fs.readFileSync(path.join(__dirname, "data/asset.css"), { encoding: "utf8" });
	const sourceMap = fs.readFileSync(path.join(__dirname, "data/asset.css.map"), { encoding: "utf8" });

	this.callback(null, transformed, JSON.parse(sourceMap));
}
