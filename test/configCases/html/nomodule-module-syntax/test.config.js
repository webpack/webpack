"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const dir = options.output.path;
		const contents = fs
			.readdirSync(dir)
			.filter((file) => file.endsWith(".js"))
			.map((file) => fs.readFileSync(path.join(dir, file), "utf8"));
		// the file a removed `nomodule` script loaded is not emitted
		expect(contents.some((text) => text.includes("MARK_LEGACY_PLAIN"))).toBe(
			true
		);
		expect(contents.some((text) => text.includes("MARK_LEGACY_MODULE"))).toBe(
			false
		);
	}
};
