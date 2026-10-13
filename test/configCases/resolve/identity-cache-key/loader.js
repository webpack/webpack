"use strict";

const path = require("path");

/** @typedef {import("../../../../").Resolver} Resolver */

/**
 * @param {string} target request `./module` is redirected to
 * @returns {(resolver: Resolver) => void} resolver plugin
 */
const redirect = (target) => (resolver) => {
	resolver
		.getHook("described-resolve")
		.tapAsync("Redirect", (request, resolveContext, callback) => {
			if (request.request !== "./module") return callback();
			resolver.doResolve(
				resolver.getHook("resolve"),
				{ ...request, request: target },
				null,
				resolveContext,
				callback
			);
		});
};

/** @type {WeakMap<HiddenRedirect, string>} */
const targets = new WeakMap();

// keeps its target out of sight, like a private field
class HiddenRedirect {
	/**
	 * @param {string} target request `./module` is redirected to
	 */
	constructor(target) {
		targets.set(this, target);
	}

	/**
	 * @param {Resolver} resolver resolver
	 */
	apply(resolver) {
		redirect(/** @type {string} */ (targets.get(this)))(resolver);
	}
}

let applied = 0;
const shared = {
	/**
	 * @param {Resolver} resolver resolver
	 */
	apply(resolver) {
		applied++;
		redirect("./a.js")(resolver);
	}
};

/** @type {import("../../../../").LoaderDefinition} */
module.exports = async function () {
	/** @type {[string, import("../../../../").ResolveOptions][]} */
	const cases = [
		["closureA", { plugins: [redirect("./a.js")] }],
		["closureB", { plugins: [redirect("./b.js")] }],
		["hiddenA", { plugins: [new HiddenRedirect("./a.js")] }],
		["hiddenB", { plugins: [new HiddenRedirect("./b.js")] }],
		["shared1", { plugins: [shared] }],
		["shared2", { plugins: [shared] }],
		["fileSystem", { fileSystem: this.fs }]
	];
	/** @type {Record<string, string | number>} */
	const results = {};
	for (const [name, options] of cases) {
		const resolve = this.getResolve({ dependencyType: "esm", ...options });
		results[name] = path.basename(await resolve(this.context, "./module"));
	}
	results.sharedApplied = applied;
	return `export default ${JSON.stringify(results)};`;
};
