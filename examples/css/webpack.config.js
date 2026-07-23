"use strict";

const path = require("path");

/** @typedef {import("webpack").Compiler} Compiler */

// A valid JS identifier can be a named export; other keys (e.g. `--foo` custom
// properties exported as `foo-bar`) are only reachable via `import * as styles`.
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Renames a CSS module's export map into a `.d.ts`. webpack's native CSS
 * defaults to `namedExports: true`, so each identifier-safe name is emitted as a
 * `export const … : string`, matching `import { foo } from "./x.module.css"`.
 * @param {string} source the CSS module resource path
 * @param {Map<string, string>} exports the original-name -> scoped-name map
 * @returns {string} the `.d.ts` contents
 */
const toDts = (source, exports) => {
	const lines = [
		`// Generated from ${path.basename(
			source
		)} by CssModuleTypesPlugin. Do not edit.`
	];
	for (const name of exports.keys()) {
		if (IDENTIFIER.test(name)) lines.push(`export const ${name}: string;`);
	}
	return `${lines.join("\n")}\n`;
};

/**
 * Emits, per CSS module, both the name map as JSON (the native-CSS equivalent of
 * the postcss-modules `getJSON` callback) and a TypeScript `.d.ts` so
 * `import … from "./x.module.css"` is typed. Both are derived from
 * `module.buildInfo.cssData.exports` (a `Map<string, string>` of original name
 * -> generated scoped name), the same source webpack uses for the JS exports —
 * so no separate re-parse of the CSS is needed. Lightning CSS exposes the same
 * data as the `exports` value returned from `transform()`.
 */
class CssModuleTypesPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { RawSource } = compiler.webpack.sources;
		const { Compilation } = compiler.webpack;

		compiler.hooks.thisCompilation.tap(
			"CssModuleTypesPlugin",
			(compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "CssModuleTypesPlugin",
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						for (const module of compilation.modules) {
							const cssData =
								/** @type {{ exports?: Map<string, string> }=} */
								(module.buildInfo && module.buildInfo.cssData);
							if (!cssData || !cssData.exports || cssData.exports.size === 0) {
								continue;
							}
							const { resource } =
								/** @type {import("webpack").NormalModule} */ (module);
							const base = path.basename(resource);
							compilation.emitAsset(
								`${base}.json`,
								new RawSource(
									`${JSON.stringify(
										Object.fromEntries(cssData.exports),
										null,
										2
									)}\n`
								)
							);
							compilation.emitAsset(
								`${base}.d.ts`,
								new RawSource(toDts(resource, cssData.exports))
							);
						}
					}
				);
			}
		);
	}
}

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		uniqueName: "app"
	},
	experiments: {
		css: true
	},
	plugins: [new CssModuleTypesPlugin()]
};

module.exports = config;
