"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(i, options) {
		return [
			fs
				.readdirSync(/** @type {string} */ (options.output.path))
				.find((name) => name.endsWith(`-${i === 0 ? "off" : "on"}.js`))
		];
	},
	afterExecute(options) {
		// A multi-config case hands the whole array over; both write to the one
		// output directory the harness assigned.
		const { output } = Array.isArray(options) ? options[0] : options;
		const names = fs
			.readdirSync(/** @type {string} */ (output.path))
			.filter((name) => name.endsWith(".js"))
			.sort();

		expect(names).toHaveLength(2);

		// The two bundles carry different bytes — `16px` against `1pc` — so the
		// content hash has to tell them apart. It would not if it were taken
		// before the embedded source was minified.
		const [off, on] = names.map((name) =>
			fs.readFileSync(path.join(output.path, name), "utf8")
		);

		expect(off).not.toBe(on);
		expect(names[0].replace(/-o(?:ff|n)\.js$/, "")).not.toBe(
			names[1].replace(/-o(?:ff|n)\.js$/, "")
		);
	}
};
