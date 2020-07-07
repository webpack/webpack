const path = require("path");
/** @type {function(any, any): import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => ({
	cache: {
		type: "memory",
		managedPaths: [path.resolve(srcPath, "node_modules")]
	}
});
