/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

import { evaluateToIdentifier } from "../javascript/JavascriptParserHelpers.js";
import ImportMetaGlobDependency from "./ImportMetaGlobDependency.js";
import { parseImportMetaGlobCall } from "./ImportMetaGlobHelpers.js";
/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("../javascript/JavascriptParser.js").default} JavascriptParser */
/** @typedef {import("../Dependency.js").DependencyLocation} DependencyLocation */

const PLUGIN_NAME = "ImportMetaGlobDependencyParserPlugin";

export default class ImportMetaGlobDependencyParserPlugin {
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
						/** @type {import("../Module.js").BuildMeta} */
						(parser.state.module.buildMeta).strictHarmonyModule
							? "strict"
							: true,
					mode: globOptions.mode,
					category: "esm"
				},
				globOptions.range
			);
			dep.loc = /** @type {DependencyLocation} */ (expr.loc);
			dep.optional = Boolean(parser.scope.inTry);
			parser.state.current.addDependency(dep);
			return true;
		});
	}
}

export { ImportMetaGlobDependencyParserPlugin as "module.exports" };
