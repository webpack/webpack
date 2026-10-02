"use strict";

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @typedef {import("../../../../lib/javascript/JavascriptParser")} JavascriptParser */

const PLUGIN_NAME = "CheckParserStateAliasPlugin";

/**
 * Fails the build where a deprecated `harmony*` parser state name stops
 * reaching what its `esm*` namesake holds.
 */
class CheckParserStateAliasPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const check = (parser) => {
					parser.hooks.finish.tap(PLUGIN_NAME, () => {
						const state = parser.state;
						const named = state.esmNamedExports;
						if (named === undefined) return;
						const where = state.module.resource;
						/**
						 * @param {string} message what is wrong
						 * @returns {void}
						 */
						const fail = (message) => {
							compilation.errors.push(new Error(`${where}: ${message}`));
						};
						// Read before writing: an own property would hide a missing
						// accessor from the write below.
						if (state.harmonyNamedExports !== named) {
							fail("harmonyNamedExports does not read esmNamedExports");
						}
						if (state.harmonyStarExports !== state.esmStarExports) {
							fail("harmonyStarExports does not read esmStarExports");
						}
						const order = state.lastESMImportOrder;
						if (state.lastHarmonyImportOrder !== order) {
							fail("lastHarmonyImportOrder does not read lastESMImportOrder");
						}
						state.lastHarmonyImportOrder = 4242;
						if (state.lastESMImportOrder !== 4242) {
							fail("lastHarmonyImportOrder does not write lastESMImportOrder");
						}
						state.lastESMImportOrder = order;
					});
				};
				for (const type of ["javascript/auto", "javascript/esm"]) {
					normalModuleFactory.hooks.parser
						.for(type)
						.tap(PLUGIN_NAME, (parser) => {
							check(/** @type {JavascriptParser} */ (parser));
						});
				}
			}
		);
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /a\.js$/,
				parser: { esm: true }
			},
			{
				test: /b\.js$/,
				// The deprecated spelling of `esm`.
				parser: { harmony: true }
			}
		]
	},
	plugins: [new CheckParserStateAliasPlugin()]
};
