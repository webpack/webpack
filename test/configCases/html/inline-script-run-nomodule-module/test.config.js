"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const chunks = fs
			.readdirSync(options.output.path)
			.filter((file) => file.endsWith(".mjs") && file !== "bundle0.mjs")
			.map((file) =>
				fs.readFileSync(path.join(options.output.path, file), "utf8")
			)
			.join("\n");
		// Only the scripts around the `nomodule` ones are bundled as modules.
		expect(chunks).toContain("MARK_A");
		expect(chunks).toContain("MARK_C");
		expect(chunks).not.toContain("MARK_B");
		expect(chunks).not.toContain("MARK_LEGACY");
	}
};
