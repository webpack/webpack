"use strict";

const AddExportsPlugin = require("./internals/add-exports-plugin");

/** @type {import("webpack").Configuration} */
module.exports = {
	plugins: [
		new AddExportsPlugin([
			// a script, so CommonJs exports
			[/legacy-global\.js$/, "module.exports = Legacy;"],
			// `export` makes the module an ES module, as it would in the source
			[/math\.js$/, "export { add, PI };"]
		])
	]
};
