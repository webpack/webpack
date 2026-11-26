"use strict";

/** @import { Configuration } from "../../../../" */

let pluginExecutionCounter = 0;

/** @type {Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.done.tap("TestPlugin", () => {
					expect(pluginExecutionCounter).toBeGreaterThan(0);
				});
			}
		}
	],
	resolve: {
		plugins: [
			{
				apply() {
					pluginExecutionCounter += 1;
				}
			},
			() => {
				pluginExecutionCounter += 1;
			}
		]
	}
};
