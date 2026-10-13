"use strict";

const path = require("path");

/** @type {import("../../../../").LoaderDefinition} */
module.exports = async function () {
	/** @type {[string, import("../../../../").ResolveOptions][]} */
	const cases = [
		["javascript", { restrictions: [/\.js$/] }],
		["json", { restrictions: [/\.json$/] }],
		["caseSensitive", { restrictions: [/\.JS$/] }],
		["caseInsensitive", { restrictions: [/\.JS$/i] }],
		["equivalent", { restrictions: [new RegExp("\\.js$")] }],
		["string", { restrictions: [String(/\.js$/)] }],
		[
			"nestedJavascript",
			{ byDependency: { esm: { restrictions: [/\.js$/] } } }
		],
		["nestedJson", { byDependency: { esm: { restrictions: [/\.json$/] } } }]
	];
	/** @type {Record<string, string | false>} */
	const results = {};
	for (const [name, options] of cases) {
		const resolve = this.getResolve({
			dependencyType: "esm",
			extensions: [".js", ".json"],
			...options
		});
		const resolved = await resolve(this.context, "./module").catch(error => {
			expect(error.message).toContain("Can't resolve './module'");
			return false;
		});
		results[name] = typeof resolved === "string" ? path.basename(resolved) : false;
	}
	return `export default ${JSON.stringify(results)};`;
};
