"use strict";

/** @import { Configuration } from "../../../../" */

// The ts-loader rule is path-scoped, so the detection probe has to read `.ts`
// out of its alternation — left on, the built-in support rejects `.tsx`.

/** @type {Configuration} */
module.exports = {
	entry: "./index.tsx",
	module: {
		rules: [
			{
				test: /[\\/]experiments-auto-and-scoped-ts-loader[\\/].*\.(ts|tsx)$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	}
};
