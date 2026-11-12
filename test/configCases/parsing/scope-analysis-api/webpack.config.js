"use strict";

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @typedef {import("../../../../lib/module/NormalModule")} NormalModule */
/** @typedef {import("../../../../lib/javascript/syntax").JavascriptScopes} JavascriptScopes */
/** @typedef {ReturnType<JavascriptScopes["analyzeScope"]>} ScopeAnalysis */

const PLUGIN_NAME = "scope-analysis-api";

/**
 * @param {ScopeAnalysis} analysis an analysis
 * @returns {{ declared: string[], free: string[] }} the module scope's names and the free ones
 */
const summarize = (analysis) => ({
	declared: analysis.moduleScope.variables.map((variable) => variable.name),
	free: analysis.unresolvedReferences.map(
		(reference) => reference.identifier.name
	)
});

/** @type {Record<string, { declared: string[], free: string[] }>} */
const EXPECTED = {
	"helper.js": { declared: ["factor", "double"], free: [] },
	"index.js": { declared: ["double", "local"], free: ["it", "expect"] }
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		/**
		 * Analyses each module's source as a plugin would, through the public
		 * syntax facade, once from a reused log and once by walking the tree.
		 * @param {Compiler} compiler the compiler
		 * @returns {void}
		 */
		(compiler) => {
			const { parser, scopes } = compiler.webpack.javascript.syntax;
			const { ScopeLog, analyzeScope } = scopes;
			const log = new ScopeLog();
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				// every module, a cached one included, which builds no more
				compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
					/** @type {string[]} */
					const analysed = [];
					for (const module of modules) {
						const { resource } = /** @type {NormalModule} */ (module);
						if (typeof resource !== "string") continue;
						const name = resource.replace(/^.*[\\/]/, "");
						const expected = EXPECTED[name];
						if (expected === undefined) continue;
						const original = /** @type {NormalModule} */ (
							module
						).originalSource();
						expect(original).not.toBeNull();
						const source = /** @type {import("webpack-sources").Source} */ (
							original
						)
							.source()
							.toString();
						const logged = summarize(
							analyzeScope(
								/** @type {number} */ (
									parser.parseProgram(source, 0, {
										sourceType: "module",
										scopes: log
									})
								)
							)
						);
						const walked = summarize(
							analyzeScope(
								/** @type {number} */ (
									parser.parseProgram(source, 0, { sourceType: "module" })
								)
							)
						);
						expect(logged).toEqual(expected);
						expect(walked).toEqual(expected);
						analysed.push(name);
					}
					expect(analysed.sort()).toEqual(Object.keys(EXPECTED));
				});
			});
		}
	]
};
