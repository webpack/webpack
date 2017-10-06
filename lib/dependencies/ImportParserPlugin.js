/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const parserHelpersLocation = require.resolve("../ParserHelpers");

class ImportParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const options = this.options;

		parser.plugin(["call System.import", "import-call"], {
			path: parserHelpersLocation,
			fnName: "ImportParser",
		}, options);
	}
}
module.exports = ImportParserPlugin;
