"use strict";

const { execFileSync } = require("child_process");
const path = require("path");

const BUILD = path.resolve(__dirname, "../fixtures/long-import-cycle/build.js");
const OUTPUT_PATH = path.resolve(__dirname, "../js/long-import-cycle");

// `--stack-size` is a V8 flag: Bun and Deno would not shrink the stack.
const isNode = !process.versions.bun && !process.versions.deno;

describe("ModuleConcatenationPlugin", () => {
	(isNode ? it : it.skip)("should concatenate an import cycle longer than the call stack allows recursing", () => {
		const length = 500;
		// A 100 KiB stack overflowed when each module of the cycle took a frame.
		const report = JSON.parse(
			execFileSync(
				process.execPath,
				["--stack-size=100", BUILD, String(length), OUTPUT_PATH],
				{ encoding: "utf8" }
			)
		);
		expect(report.errors).toEqual([]);
		// The cycle, the entry and the counter, all in one module.
		expect(report.concatenated).toEqual([length + 2]);
		expect(report.result).toEqual({ count: length, first: 0 });
	});
});
