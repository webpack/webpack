/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class UnsplitDynamicImportWarning extends WebpackError {
	/**
	 * Creates an instance of UnsplitDynamicImportWarning.
	 * @param {string[]} imports descriptions of the `import()` calls that split nothing
	 */
	constructor(imports) {
		const list = imports.map((description) => `\n  ${description}`).join("");

		super(
			`dynamic imports: ${
				imports.length === 1
					? "an 'import()' targets a module already loaded where it runs"
					: "these 'import()' calls target modules already loaded where they run"
			}, so nothing is deferred:${list}\n'import()' only splits a module out when nothing already loaded pulls it in — a static 'import' of it in the same entrypoint cancels the split.\nFor more info visit https://webpack.js.org/guides/code-splitting/`
		);

		/** @type {string} */
		this.name = "UnsplitDynamicImportWarning";
	}
}

module.exports = UnsplitDynamicImportWarning;
