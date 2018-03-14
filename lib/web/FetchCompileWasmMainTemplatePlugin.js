/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const BaseWasmMainTemplatePlugin = require("../BaseWasmMainTemplatePlugin");

class FetchCompileWasmMainTemplatePlugin {
	apply(mainTemplate) {
		const generateLoadBinaryCode = path =>
			`fetch(${mainTemplate.requireFn}.p + ${path})`;

		new BaseWasmMainTemplatePlugin().apply(
			mainTemplate,
			generateLoadBinaryCode
		);
	}
}

module.exports = FetchCompileWasmMainTemplatePlugin;
