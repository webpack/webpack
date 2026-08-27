"use strict";

const fs = require("fs");
const path = require("path");

const BOM = "\uFEFF";

module.exports = {
	afterExecute(options) {
		const outputPath = options.output.path;
		const emitted = fs
			.readdirSync(outputPath)
			.filter((file) => file.endsWith(".css") || file.endsWith(".js"));
		const stylesheets = emitted.filter((file) => file.endsWith(".css"));

		expect(stylesheets).not.toHaveLength(0);

		for (const file of emitted) {
			const source = fs.readFileSync(path.resolve(outputPath, file), "utf8");

			// A BOM past byte 0 is the corrupting case: concatenation puts it
			// mid-file and the browser silently drops the rule that follows.
			expect(source).not.toContain(BOM);
		}

		for (const file of stylesheets) {
			const source = fs.readFileSync(path.resolve(outputPath, file), "utf8");

			expect(source).toContain(".first::after");
			expect(source).toContain(".second::after");
		}
	}
};
