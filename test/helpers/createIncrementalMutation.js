"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

/** @import { Compilation, Compiler } from "../../" */
/** @import Incremental from "../../lib/watch/Incremental" */
/** @typedef {Compilation & { _incremental: Incremental }} IncrementalCompilation */
/**
 * @typedef {object} IncrementalMutation
 * @property {string} name fault being introduced
 * @property {"graph" | "comparison"} detector expected failure
 * @property {"_rebuild" | "removePreRebuildConnections"} method method to replace on each watch compilation
 * @property {string} before unique source fragment
 * @property {string} after replacement that calls recordMutation when the fault is reached
 */

/**
 * Compiles a mutated copy, installing only its selected method on watched compilations.
 * @param {IncrementalMutation} mutation fault to inject
 * @returns {{ apply: (compiler: Compiler) => void, check: (error: Error) => void, failures: () => number }} fault injection and recovery assertions
 */
const createIncrementalMutation = (mutation) => {
	const filename = require.resolve("../../lib/watch/Incremental");
	const source = fs.readFileSync(filename, "utf8");
	const position = source.indexOf(mutation.before);
	assert(
		position >= 0 && position === source.lastIndexOf(mutation.before),
		`${mutation.name}: expected exactly one mutation location`
	);
	let hits = 0;
	let failures = 0;
	const sandbox = {
		module: { exports: {} },
		require: (/** @type {string} */ request) =>
			require(path.resolve(path.dirname(filename), request)),
		recordMutation: () => {
			hits++;
		}
	};
	new vm.Script(source.replace(mutation.before, mutation.after), {
		filename
	}).runInNewContext(sandbox);
	const MutatedIncremental = /** @type {typeof Incremental} */ (
		sandbox.module.exports
	);
	return {
		/**
		 * @param {Compiler} compiler watched compiler
		 * @returns {void}
		 */
		apply(compiler) {
			compiler.hooks.compilation.tap("IncrementalMutation", (compilation) => {
				if (!compiler.watchMode || failures > 0) return;
				const incremental = /** @type {IncrementalCompilation} */ (compilation)
					._incremental;
				Object.defineProperty(incremental, mutation.method, {
					value: MutatedIncremental.prototype[mutation.method],
					configurable: true,
					writable: true
				});
			});
		},
		/**
		 * @param {Error} error expected failure detected by the watch runner
		 * @returns {void}
		 */
		check(error) {
			expect(failures).toBe(0);
			expect(hits).toBeGreaterThan(0);
			if (mutation.detector === "graph") {
				expect(error).toBeInstanceOf(assert.AssertionError);
				expect(error.message).toMatch(/branch\.js: stale outgoing dependency$/);
			} else {
				expect(
					/** @type {Error & { matcherResult?: { pass: boolean, name: string } }} */ (
						error
					).matcherResult
				).toMatchObject({ name: "toEqual", pass: false });
			}
			failures++;
		},
		/** @returns {number} detected mutations */
		failures: () => failures
	};
};

module.exports = createIncrementalMutation;
