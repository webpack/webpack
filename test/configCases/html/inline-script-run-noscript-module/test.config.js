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
		// The scripts around the `noscript` are bundled apart, in page order.
		expect(modules).toHaveLength(3);
		const [a, b, c] = modules.map((file) =>
			fs.readFileSync(path.join(dir, file), "utf8")
		);
		expect(a).toContain("MARK_A");
		expect(b).toContain("MARK_B");
		expect(c).toContain("MARK_C");
		expect(a).not.toContain("MARK_B");
		expect(a).not.toContain("MARK_C");
		expect(c).not.toContain("MARK_B");
	}
};
