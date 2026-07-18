/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const {
	evaluateToIdentifier
} = require("../javascript/JavascriptParserHelpers");
const ImportMetaGlobDependency = require("./ImportMetaGlobDependency");
const { parseImportMetaGlobCall } = require("./ImportMetaGlobHelpers");

/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */

const PLUGIN_NAME = "ImportMetaGlobDependencyParserPlugin";

module.exports = class ImportMetaGlobDependencyParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.evaluateIdentifier
			.for("import.meta.glob")
			.tap(PLUGIN_NAME, (expr) =>
				evaluateToIdentifier(
					"import.meta.glob",
					"import.meta",
					() => ["glob"],
					true
				)(expr)
			);
		parser.hooks.call.for("import.meta.glob").tap(PLUGIN_NAME, (expr) => {
			const {
				options: globOptions,
				errors,
				warnings
			} = parseImportMetaGlobCall(/** @type {CallExpression} */ (expr), parser);
			for (const warning of warnings) {
				parser.state.module.addWarning(warning);
			}
			if (errors.length) {
				for (const error of errors) parser.state.current.addError(error);
				return;
			}
			if (!globOptions) return;
			const dep = new ImportMetaGlobDependency(
				{
					request: `${globOptions.baseDir}${globOptions.query}`,
					recursive: globOptions.recursive,
					regExp: false,
					patterns: globOptions.patterns,
					requestContext: globOptions.requestContext,
					importName: globOptions.importName,
					exhaustive: globOptions.exhaustive,
					caseSensitive: globOptions.caseSensitive,
					referencedExports: globOptions.referencedExports,
					namespaceObject:
						/** @type {import("../Module").BuildMeta} */
						(parser.state.module.buildMeta).strictHarmonyModule
							? "strict"
							: true,
					mode: globOptions.mode,
					category: "esm"
				},
				globOptions.range
			);
			dep.loc = parser.getLocation(expr);
			dep.optional = Boolean(parser.scope.inTry);
			parser.state.current.addDependency(dep);
			return true;
		});
	}
};
