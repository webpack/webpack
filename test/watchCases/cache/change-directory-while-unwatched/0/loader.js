"use strict";

const path = require("path");

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function loader() {
	const callback = this.async();
	const directory = path.resolve(this.rootContext, "ctx");
	this.addContextDependency(directory);
	this.fs.readdir(directory, (err, names) => {
		if (err) return callback(err);
		const list = /** @type {string[]} */ (names).map(String).sort();
		callback(null, `export default ${JSON.stringify(list)};`);
	});
};
