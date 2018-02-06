/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class UrlAssetGenerator {
	generate(module) {
		return module.originalSource();
	}
}

module.exports = UrlAssetGenerator;
