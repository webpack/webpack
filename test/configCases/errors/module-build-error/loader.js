"use strict";

/** @typedef {import("../../../../lib/errors/ModuleBuildError").ErrorWithHideStack} ErrorWithHideStack */

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader() {
	const shape = this.resourceQuery.slice(1);

	switch (shape) {
		// V8 puts "Name: message" at the top of `.stack`, so the whole stack is used.
		case "v8":
			throw new Error("v8 boom");
		// JSC and friends emit frames only; the message has to be led with instead.
		case "jsc": {
			const error = new Error("jsc boom");
			error.name = "TypeError";
			error.stack = "doStuff@file.js:1:1\nglobal code@file.js:2:2";
			throw error;
		}
		case "no-name": {
			const error = new Error("no-name boom");
			error.name = "";
			error.stack = "@file.js:1:1";
			throw error;
		}
		case "hide-stack": {
			const error = new Error("hidden boom");
			error.stack = "Error: hidden boom\n    at hidden-frame.js:1:1";
			/** @type {ErrorWithHideStack} */ (error).hideStack = true;
			throw error;
		}
		case "no-stack": {
			const error = new Error("stackless boom");
			error.stack = "";
			throw error;
		}
		case "nothing": {
			const error = new Error();
			error.stack = "";
			throw error;
		}
		default:
			throw new Error(`unknown shape ${shape}`);
	}
};
