"use strict";

const fs = require("fs");
const path = require("path");

/** @typedef {{ calls: number }} CallCounter */

/**
 * Counts every call the resolver makes, so `done` can tell whether webpack
 * resolved through this filesystem or replaced it with the compiler's own.
 * @param {CallCounter} counter box holding the call count
 * @returns {typeof fs} a counting view of the real filesystem
 */
const countingFileSystem = (counter) =>
	new Proxy(fs, {
		get(target, key, receiver) {
			const value = Reflect.get(target, key, receiver);

			if (typeof value !== "function") return value;

			return function countingCall(/** @type {EXPECTED_ANY[]} */ ...args) {
				counter.calls += 1;
				return value.apply(target, args);
			};
		}
	});

/** @type {CallCounter} */
const moduleCounter = { calls: 0 };
/** @type {CallCounter} */
const loaderCounter = { calls: 0 };

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /dep\.js$/,
				use: "./loader"
			}
		]
	},
	resolve: {
		fileSystem: countingFileSystem(moduleCounter)
	},
	resolveLoader: {
		modules: [path.resolve(__dirname)],
		fileSystem: countingFileSystem(loaderCounter)
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.done.tap("TestPlugin", () => {
					expect(moduleCounter.calls).toBeGreaterThan(0);
					expect(loaderCounter.calls).toBeGreaterThan(0);
				});
			}
		}
	]
};
