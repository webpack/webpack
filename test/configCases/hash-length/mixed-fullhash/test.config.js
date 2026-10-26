"use strict";

module.exports = {
	findBundle(i, options) {
		// Web chunks are not fetched by the runner, so they are loaded up front.
		if (i === 3) {
			return ["async_js.chunk3.js", "async_css.chunk3.js", "bundle3.js"];
		}
		return `./bundle${i}.${options.output.module ? "mjs" : "js"}`;
	}
};
