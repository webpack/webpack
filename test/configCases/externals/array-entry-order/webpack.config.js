"use strict";

/** @type {import("../../../../").ExternalItem[]} */
const externals = [
	"path",
	"util",
	// Runs between two runs of strings, so it must still win for "os-alias".
	({ request }, callback) => {
		if (request === "os-alias") return callback(null, "os");
		// Appends an entry while matching: this walk and later ones must see it.
		if (request === "os" && !externals.includes("os")) externals.push("os");
		// Replaces an entry in place while matching a request nothing externalizes.
		if (request.startsWith("./index")) externals[4] = { path: "os" };
		callback();
	},
	"os-alias",
	// The strings above match "path" first, so this mapping never applies.
	{ path: "os" },
	// A RegExp subclass runs user code too, and may append an entry the same way.
	new (class extends RegExp {
		/**
		 * @param {string} request the request
		 * @returns {boolean} never a match itself
		 */
		test(request) {
			if (request === "zlib" && !externals.includes("zlib")) {
				externals.push("zlib");
			}
			return false;
		}
	})("^$")
];

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	externalsType: "commonjs",
	externals
};
