"use strict";

const path = require("node:path");
const { parseResource } = require("../../../../lib/util/identifier");

module.exports = {
	timeout: 120000,
	findBundle(_, options) {
		const ext = path.extname(parseResource(options.output.filename).path);
		return `./bundle${ext}`;
	}
};
