"use strict";

const fs = require("fs");
const path = require("path");
const findOutputFiles = require("../../../helpers/findOutputFiles");

module.exports = {
	findBundle(i, options) {
		const runtime = findOutputFiles(options, /^runtime\.js$/)[0];
		const src = fs.readFileSync(
			path.join(options.output.path, runtime),
			"utf8"
		);

		const block = /var moduleToHandlerMapping = \{([\s\S]*?)^[^\n]*?\};/m.exec(
			src
		);
		expect(block).not.toBeNull();
		const ids = [...block[1].matchAll(/^[^\n]*?\b(\d+):\s*\(\)/gm)].map((m) =>
			Number(m[1])
		);
		expect(ids.length).toBeGreaterThan(0);

		const sorted = [...ids].sort((a, b) => a - b);
		expect(ids).toEqual(sorted);

		return [`./${runtime}`, `./${findOutputFiles(options, /^main\.js$/)[0]}`];
	}
};
