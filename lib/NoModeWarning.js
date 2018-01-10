/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");

module.exports = class NoModeWarning extends WebpackError {
	constructor(modules) {
		super();

		this.name = "NoModeWarning";
		this.message = "configuration\n" +
			"The 'mode' option has not been set. " +
			"Set 'mode' option to a vakze to enable defaults for this enviroment. These are your options:\n" +
			"* \"development\": Use this for development. It enables simple devtools and offers fast incremental compilation with support for watching.\n" +
			"* \"production\": Use this for a simple production-ready build. It enables optimization for minimal bundle size, but keeps bundle filename constant. It's optimized for a single build without watching.\n" +
			"* \"production-expert\": This mode enables additional optimizations, which require changing the bundle filename. This makes this mode more difficult to use.\"" +
			"For further customization possiblilities take a look on the following options: \"devtool\", \"optimizations\", \"output.filename\"";

		Error.captureStackTrace(this, this.constructor);
	}
};
