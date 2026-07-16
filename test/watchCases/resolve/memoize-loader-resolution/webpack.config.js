"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Watch node_modules so a change to my-loader's package.json invalidates
	// the modules that resolved through it.
	snapshot: {
		managedPaths: []
	},
	module: {
		rules: [
			{
				// Both modules resolve the same "my-loader"; the second resolve is a
				// cache hit, so its resolve dependencies come from the memoized entry.
				test: /[xy]\.js$/,
				use: "my-loader"
			}
		]
	}
};
