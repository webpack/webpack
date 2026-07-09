/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Viswa (Open Source Contributor)
*/

"use strict";

const PLUGIN_NAME = "ImportMetaGlobDependencyParserPlugin";

module.exports = class ImportMetaGlobDependencyParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {import("../javascript/JavascriptParser")} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.call.for("import.meta.glob").tap(
			PLUGIN_NAME,
			(expr) =>
				// TODO: We will add the logic to extract the glob pattern here
				true
		);
	}
};
