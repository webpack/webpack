"use strict";

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");

/** @import { OutputFileSystem } from "../lib/util/fs" */

// Any `require("acorn")` from `lib/` fails the build rather than resolving the
// devDependency the parity tests still use.
jest.mock("acorn", () => {
	throw new Error("lib/ must not require acorn at runtime");
});

const webpack = require("../lib/index");

describe("parsing without acorn", () => {
	it("should not list acorn among webpack's runtime dependencies", () => {
		const { dependencies } = require("../package.json");

		expect(Object.keys(dependencies)).not.toContain("acorn");
	});

	it("should build a module covering the parser's grammar", (done) => {
		const compiler = webpack({
			mode: "development",
			context: path.resolve(__dirname, "fixtures", "parser-no-acorn"),
			entry: "./index.js",
			output: { path: "/out" }
		});
		compiler.outputFileSystem = /** @type {OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, stats) => {
			if (err) return done(err);
			const { errors, warnings } = /** @type {import("../lib/Stats")} */ (
				stats
			).toJson({ all: false, errors: true, warnings: true });
			expect(errors).toEqual([]);
			expect(warnings).toEqual([]);
			compiler.close(done);
		});
	});
});
