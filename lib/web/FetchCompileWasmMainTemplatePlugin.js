/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const BaseWasmMainTemplatePlugin = require("../BaseWasmMainTemplatePlugin");

class FetchCompileWasmMainTemplatePlugin {
	apply(mainTemplate) {
		new BaseWasmMainTemplatePlugin().applyWeb(mainTemplate);
	}
}

module.exports = FetchCompileWasmMainTemplatePlugin;
