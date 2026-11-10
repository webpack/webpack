"use strict";

const path = require("path");

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function loader() {
	const callback = this.async();
	const file = path.join(this.context, "data.txt");
	this.addDependency(file);
	this.fs.readFile(file, (err, content) => {
		if (err) return callback(err);
		callback(null, `module.exports = ${JSON.stringify(String(content).trim())};`);
	});
};
