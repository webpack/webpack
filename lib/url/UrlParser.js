/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");

class UrlParser {
	parse(source, state) {
		const { module } = state;

		module.buildInfo.url = path.relative(module.context, module.request);

		return state;
	}
}

module.exports = UrlParser;
