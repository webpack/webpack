"use strict";

// A chain of `dependOn` diamonds: root -> [left, right] -> join -> [left, right]
// -> join ... Every join is reachable by two paths, so a traversal that does not
// remember visited entrypoints costs 2 ** DEPTH visits of the last one. `node`
// chunk loading is what pulls in `getRuntimeChunkDependentChunksIterable`
// (StartupChunkDependenciesPlugin requires `ensureChunkIncludeEntries`).
// At this depth the undeduplicated traversal needs ~50s, so it fails the test
// timeout rather than merely being slow.
const DEPTH = 16;

/** @type {Record<string, string | { import: string, dependOn: string | string[] }>} */
const entry = { main: "./index.js" };

let current = "main";
for (let i = 0; i < DEPTH; i++) {
	entry[`left${i}`] = { import: "./empty.js", dependOn: current };
	entry[`right${i}`] = { import: "./empty.js", dependOn: current };
	entry[`join${i}`] = {
		import: "./empty.js",
		dependOn: [`left${i}`, `right${i}`]
	};
	current = `join${i}`;
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	entry,
	output: { filename: "[name].js" }
};
