"use strict";

/** @type {string[]} */
const events = [];

/**
 * @param {import("../../../../").Compiler} compiler a child compiler
 * @returns {void}
 */
const recordEvents = (compiler) => {
	compiler.hooks.watchRun.tap("MultiCompilerDependencies", () => {
		events.push(`${compiler.name} run`);
	});
	compiler.hooks.done.tap("MultiCompilerDependencies", () => {
		events.push(`${compiler.name} done`);
	});
};

/**
 * @param {string} name compiler name
 * @param {string} entry entry module
 * @param {string} filename emitted bundle
 * @returns {import("../../../../").Configuration} a child configuration
 */
const child = (name, entry, filename) => ({
	name,
	entry,
	output: { clean: false, filename },
	plugins: [recordEvents]
});

/** @type {import("../../../../").MultiConfiguration} */
module.exports = Object.assign(
	[
		{ ...child("a", "./index.js", "bundle.js"), dependencies: ["b", "c"] },
		child("b", "./b.js", "b-bundle.js"),
		child("c", "./c.js", "c-bundle.js")
	],
	{ parallelism: 1, events }
);
