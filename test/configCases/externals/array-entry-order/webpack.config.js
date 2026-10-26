"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	externalsType: "commonjs",
	externals: [
		"path",
		"util",
		// Runs between two runs of strings, so it must still win for "os-alias".
		({ request }, callback) =>
			request === "os-alias" ? callback(null, "os") : callback(),
		"os-alias",
		// The strings above match "path" first, so this mapping never applies.
		{ path: "os" }
	]
};
