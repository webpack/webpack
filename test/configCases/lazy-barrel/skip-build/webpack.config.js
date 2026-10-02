"use strict";

const createLazyBarrelTest = require("../_helpers/createLazyBarrelTest");

module.exports = createLazyBarrelTest(
	// modules of `heavy-lib` that must stay deferred when only `used` is imported
	["node_modules/heavy-lib/unused.js", "node_modules/heavy-lib/deep.js"],
	{
		optimization: {
			minimize: false
		},
		module: {
			// A loader that throws if it runs on the unused subtree; lazy barrel must
			// never factorize/build those modules, so it must never execute (#15643).
			rules: [
				{
					test: /heavy-lib[\\/](unused|deep)\.js$/,
					use: require.resolve("./boom-loader.js")
				}
			]
		}
	}
);
