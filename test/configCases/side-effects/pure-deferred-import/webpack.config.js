"use strict";

const target = `async-node${process.versions.node.split(".").map(Number)[0]}`;

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		name: "plain",
		target,
		mode: "production",
		experiments: { deferImport: true },
		optimization: {
			// Renders the deferred import through `importStatement`.
			concatenateModules: false
		}
	},
	{
		name: "concatenated",
		target,
		mode: "production",
		experiments: { deferImport: true },
		// A CommonJS module cannot join the concatenation, so it stays an external
		// member of it and `ConcatenatedModule` renders the deferred loader itself.
		optimization: { concatenateModules: true }
	}
];
