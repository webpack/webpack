/*
    MIT License http://www.opensource.org/licenses/mit-license.php
    Author Arka Pratim Chaudhuri @arkapratimc
*/

"use strict";

const WebpackError = require("./WebpackError");

class FalseIifeUmdWarning extends WebpackError {
	constructor() {
		super();
		this.name = "FalseIifeUmdWarning";
		this.message =
			"configuration\n" +
			"Setting 'output.iife' to 'false' is incompatible with 'output.library.type' set to 'umd'. This configuration may cause unexpected behavior, as UMD libraries are expected to use an IIFE (Immediately Invoked Function Expression) to support various module formats. Consider setting 'output.iife' to 'true' or choosing a different 'library.type' to ensure compatibility.\nLearn more: https://webpack.js.org/configuration/output/";
	}
}

class WarnFalseIifeUmdPlugin {
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"WarnFalseIifeUmdPlugin",
			compilation => {
				compilation.warnings.push(new FalseIifeUmdWarning());
			}
		);
	}
}

module.exports = WarnFalseIifeUmdPlugin;
