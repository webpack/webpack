/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");

class UrlJavascriptGenerator {
	generate(module, { chunkGraph, mainTemplate, outputOptions }) {
		const filename = module.resource;
		const filenameTemplate = outputOptions.urlModuleFilename;

		const url = mainTemplate.getAssetPath(filenameTemplate, {
			module,
			filename,
			chunkGraph
		});

		const source = `module.exports = __webpack_require__.p + '${url}'`;

		return new RawSource(source);
	}
}

module.exports = UrlJavascriptGenerator;
