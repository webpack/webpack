"use strict";

const fs = require("node:fs");
const path = require("node:path");

module.exports = {
	findBundle(i, options) {
		const bundle = "./@scope/app.js";
		const chunk = path.join(options.output.path, "chunks/@scope/chunk.js");
		if (!fs.existsSync(chunk)) {
			throw new Error(
				`Expected chunk to be emitted verbatim at ${chunk} (no URL-encoding of '@'); see https://github.com/jantimon/html-webpack-plugin/issues/1771`
			);
		}
		return [bundle];
	}
};
