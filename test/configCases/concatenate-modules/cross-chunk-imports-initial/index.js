import { registered } from "./shared/register.js";
import { greet } from "./shared/greet.js";
import { both } from "./shared/both.js";

it("should link an initial chunk's modules into the entry chunk", async () => {
	expect(registered()).toBe(1);
	expect(greet("a")).toBe("hello a");
	expect(both()).toBe("both");
	const lazy = await import(/* webpackChunkName: "lazy" */ "./lazy.js");
	expect(lazy.useBoth()).toBe("both");
});

/**
 * Returns the cross-chunk bailouts stats report for a module.
 * @param {string} name the module name
 * @returns {string[]} the bailout reasons
 */
const getBailouts = (name) => {
	const module = __STATS__.children[__STATS_I__].modules.find(
		(module) => module.name === name
	);
	return (module.optimizationBailout || []).filter((reason) =>
		reason.startsWith("Cross-chunk imports bailout: ")
	);
};

it("should report the bailouts of an initial chunk's modules", () => {
	const prefix = "Cross-chunk imports bailout: ";
	// a reason that keeps the whole chunk in the registry
	const chunkBailout = [
		undefined,
		undefined,
		"chunk is shared by more than one runtime",
		"chunk is loaded both initially and on demand"
	][CONFIG_INDEX];
	if (chunkBailout !== undefined) {
		for (const name of [
			"./shared/register.js",
			"./shared/greet.js",
			"./shared/both.js"
		]) {
			expect(getBailouts(name)).toEqual([`${prefix}${chunkBailout}`]);
		}
		return;
	}
	expect(getBailouts("./shared/both.js")).toEqual([
		`${prefix}./lazy.js imports it from an on-demand chunk`
	]);
	expect(getBailouts("./shared/greet.js")).toEqual([]);
});

it("should import the scope natively and keep on-demand importers on the registry", () => {
	if (CONFIG_INDEX >= 2) return;
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const read = (file) => fs.readFileSync(path.join(__dirname, file), "utf-8");
	const shared = read(`shared-${CONFIG_INDEX}.mjs`);
	const parts = shared.split(/^\};$/m);
	expect(parts).toHaveLength(2);
	const [registry, scope] = parts;
	expect(scope).toContain("function greet(");
	// the entry runs its effect first, so the chunk load may run it
	expect(scope).toContain("globalThis.crossChunkRegistered = ");
	expect(scope).not.toContain("__webpack_require__");
	// the on-demand lazy chunk resolves imports against the public path, not the entry
	expect(registry).toContain('const both = () => "both";');
	const imports = read(`bundle${CONFIG_INDEX}.mjs`)
		.split("\n")
		.filter((line) =>
			line.endsWith(` } from "./shared-${CONFIG_INDEX}.mjs";`)
		);
	expect(imports).toHaveLength(1);
	expect(imports[0]).toMatch(/^import \{ \$\d/);
	expect(imports[0]).toContain(" as __webpack_linked_");
});
