"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const dir = options.output.path;
		const page = fs.readFileSync(path.join(dir, "bundle0.mjs"), "utf8");
		/** @type {string[]} */
		const modules = [];
		const SRC = /src=\\"([^"\\]+\.mjs)\\" type=\\"module\\"/g;
		let match;
		while ((match = SRC.exec(page)) !== null) modules.push(match[1]);
		// The scripts around the `nomodule` ones are bundled as modules, in page order.
		expect(modules).toHaveLength(2);
		const [a, c] = modules.map((file) =>
			fs.readFileSync(path.join(dir, file), "utf8")
		);
		expect(a).toContain("MARK_A");
		expect(a).not.toContain("MARK_C");
		expect(c).toContain("MARK_C");
		for (const chunk of [a, c]) {
			expect(chunk).not.toContain("MARK_B");
			expect(chunk).not.toContain("MARK_LEGACY");
		}
	}
};
