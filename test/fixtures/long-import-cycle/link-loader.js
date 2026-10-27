"use strict";

/** @typedef {{ length: number }} LinkLoaderOptions */

/**
 * Turns `link.js?<n>` into a module importing `link.js?<n + 1>`, the last one closing the cycle.
 * @this {import("../../../").LoaderContext<LinkLoaderOptions>}
 * @returns {string} the generated module
 */
module.exports = function linkLoader() {
	const { length } = this.getOptions();
	const index = Number(this.resourceQuery.slice(1));
	return [
		'import counter from "./counter.js";',
		`import next from "./link.js?${(index + 1) % length}";`,
		// A side effect, so no side-effect-free optimization walks the cycle first.
		"counter.count++;",
		`export default function value() { return typeof next === "function" ? ${index} : -1; }`
	].join("\n");
};
