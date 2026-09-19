"use strict";

// The global object is spelled `globalThis` where the target has the binding
// and `__webpack_require__.g` where it does not, so both are built here.
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "node",
		entry: "./entry-global-this.js",
		module: {
			parser: {
				javascript: {
					topLevelThis: "global"
				}
			}
		},
		output: {
			environment: {
				globalThis: true
			}
		}
	},
	{
		target: "node",
		entry: "./entry-webpack-global.js",
		module: {
			parser: {
				javascript: {
					topLevelThis: "global"
				}
			}
		},
		output: {
			environment: {
				globalThis: false
			}
		}
	},
	{
		target: "node",
		// the option says what `this` is, which does not depend on CommonJS
		// syntax being parsed at all
		entry: "./entry-no-commonjs.js",
		module: {
			parser: {
				javascript: {
					commonjs: false,
					topLevelThis: "global"
				}
			}
		}
	},
	{
		target: "node",
		// a module declaring `globalThis` itself must still reach the real global
		entry: "./entry-shadowed.js",
		module: {
			parser: {
				javascript: {
					topLevelThis: "global"
				}
			}
		},
		output: {
			environment: {
				globalThis: true
			}
		}
	},
	{
		target: "node",
		entry: "./entry-default.js"
	},
	{
		target: "node",
		// a `.js` file the parser decides is an ES module, where the option must
		// not apply: `this` is `undefined` there whatever it says
		entry: "./entry-esm.js",
		module: {
			parser: {
				javascript: {
					topLevelThis: "global"
				}
			}
		}
	}
];
