"use strict";

const baseConfig = require("./jest.config");

// Deno-only jest config.
//
// Deno (2.8.3) panics at the Rust level (libs/core/runtime/bindings.rs
// "Module not found") when webpack calls require() during/after a test's
// teardown — e.g. ImportMetaPlugin doing require("../../package.json") once a
// compilation outlives the test. Node throws a catchable ReferenceError here;
// Deno aborts the whole process, so a single offending test kills the run.
//
// The *TestCases suites compile and execute generated bundles that hit that
// pattern, so they are skipped under Deno until the upstream Deno panic is
// fixed (https://github.com/denoland/deno/issues). Every other suite runs.
/** @type {import("jest").Config} */
const config = Object.assign({}, baseConfig, {
	testPathIgnorePatterns: ["/node_modules/", "<rootDir>/test/[^/]*TestCases"]
});

module.exports = config;
