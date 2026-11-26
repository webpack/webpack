"use strict";

const path = require("path");

/** @import { Configuration, Compiler, Watching } from "../../../.." */

/**
 * @param {Record<string, unknown> | undefined} _env environment
 * @param {{ srcPath: string }} paths fixture paths
 * @returns {Configuration[]} watch configurations
 */
module.exports = (_env, { srcPath }) =>
	["first", "second"].map((name, index) => {
		let closed = 0;
		const plugin = {
			/** @type {(() => Promise<void>) | undefined} */
			run: undefined,
			/**
			 * @param {Compiler} compiler watched compiler
			 * @returns {void}
			 */
			apply(compiler) {
				compiler.hooks.watchClose.tap("CloseIdle", () => {
					closed++;
				});
				compiler.hooks.done.tap("CloseIdle", () => {
					plugin.run = async () => {
						const watching = compiler.watching;
						expect(watching).toBeDefined();
						expect(closed).toBe(0);
						await new Promise((resolve, reject) => {
							/** @type {Watching} */
							(watching).close((error) => {
								// The hook has run by the time the callback does.
								expect(closed).toBe(1);
								if (error) reject(error);
								else resolve(undefined);
							});
						});
						expect(compiler.watchMode).toBe(false);
						expect(compiler.watching).toBeUndefined();
					};
				});
			}
		};
		return {
			context: path.join(srcPath, name),
			mode: "development",
			output: { clean: false, filename: `bundle${index}.js` },
			plugins: [plugin]
		};
	});
