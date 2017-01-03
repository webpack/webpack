/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
"use strict";

module.exports = class NoAsyncChunksWarning extends Error {
	constructor() {
		super();
		Error.captureStackTrace(this, this.constructor);
		this.name = "NoAsyncChunksWarning";
		this.message = "webpack performance recommendations: \n" +
			"You can limit the size of your bundles by using import() or require.ensure to lazy load some parts of your application.\n" +
			"For more info visit https://webpack.js.org/guides/code-splitting/";
	}
};
