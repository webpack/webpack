"use strict";

// Minifies each job read as JSON from stdin with oxc-minify, writing the
// outputs as JSON to stdout. A panic in oxc aborts this process, not the caller.

const fs = require("fs");

/** @type {{ filename: string, input: string, options: Record<string, unknown> }[]} */
const jobs = JSON.parse(fs.readFileSync(0, "utf8"));
// oxc-minify is an ES module, which `require` cannot load on every Node.
// eslint-disable-next-line no-new-func
const importModule = new Function("specifier", "return import(specifier)");
importModule("oxc-minify").then(
	/**
	 * @param {{ minifySync: (filename: string, code: string, options: Record<string, unknown>) => { code: string, errors: unknown[] } }} oxc oxc-minify
	 */
	({ minifySync }) => {
		process.stdout.write(
			JSON.stringify(
				jobs.map(({ filename, input, options }) => {
					const result = minifySync(filename, input, options);
					return result.errors.length > 0 ? null : result.code;
				})
			)
		);
	}
);
