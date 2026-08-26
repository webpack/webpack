"use strict";

const { execFileSync } = require("child_process");
const path = require("path");
const webpack = require("..");

/**
 * Creates a production compiler and reports the switch afterwards.
 * @param {EXPECTED_ANY} options extra webpack options
 * @returns {string | undefined} `process.env.SKIP_VALIDATION` after creation
 */
const createCompiler = (options) => {
	const compiler = webpack({
		context: __dirname,
		mode: "production",
		entry: "./fixtures/a",
		...options
	});
	compiler.close(() => {});
	return process.env.SKIP_VALIDATION;
};

describe("default minimizer", () => {
	const original = process.env.SKIP_VALIDATION;

	afterEach(() => {
		if (original === undefined) {
			delete process.env.SKIP_VALIDATION;
		} else {
			process.env.SKIP_VALIDATION = original;
		}
	});

	// In a child process, so an unrelated test cannot have loaded ajv first.
	it("creates a production compiler without loading ajv", () => {
		const script = `
			const webpack = require(${JSON.stringify(path.join(__dirname, ".."))});
			webpack({
				context: ${JSON.stringify(__dirname)},
				mode: "production",
				entry: "./fixtures/a"
			});
			const loaded = Object.keys(require.cache).some((id) =>
				/[\\\\/]node_modules[\\\\/]ajv[\\\\/]/.test(id)
			);
			process.stdout.write(loaded ? "loaded" : "not loaded");
		`;
		expect(execFileSync(process.execPath, ["-e", script]).toString()).toBe(
			"not loaded"
		);
	});

	it("leaves the option check switch unset", () => {
		delete process.env.SKIP_VALIDATION;
		expect(createCompiler({})).toBeUndefined();
		expect("SKIP_VALIDATION" in process.env).toBe(false);
	});

	it("leaves the option check switch unset with css and html enabled", () => {
		delete process.env.SKIP_VALIDATION;
		expect(
			createCompiler({ experiments: { css: true, html: true } })
		).toBeUndefined();
		expect("SKIP_VALIDATION" in process.env).toBe(false);
	});

	it("restores an explicitly set option check switch", () => {
		process.env.SKIP_VALIDATION = "n";
		expect(createCompiler({})).toBe("n");
	});

	it("keeps checking the options of a minimizer the user constructs", () => {
		delete process.env.SKIP_VALIDATION;
		createCompiler({});

		const TerserPlugin = require("minimizer-webpack-plugin");

		expect(
			() =>
				new TerserPlugin(/** @type {EXPECTED_ANY} */ ({ notAnOption: true }))
		).toThrow(/Terser Plugin/);
	});
});
