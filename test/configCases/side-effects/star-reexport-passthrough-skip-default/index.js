import * as ns from "lib";
import Button from "lib/button/index.js";

const SKIP = "(skipped side-effect-free modules)";

const find = (suffix) => __STATS__.modules.find((m) => m.name.endsWith(suffix));
const skippedFromBarrel = (suffix) =>
	find(suffix).reasons.some(
		(r) =>
			r.explanation === SKIP && r.moduleName === "./node_modules/lib/index.js"
	);

it("should not forward the default export through a star passthrough", () => {
	expect(Button()).toBe("button");
	expect(ns.variant()).toBe("primary");
	expect(ns.namedAsDefault()).toBe("named-as-default");
	expect(ns.localDefault()).toBe("local-default");
	expect(ns.namespaceDefault()).toBe("namespace-default");
	expect(ns.renamedDefault()).toBe("renamed-default");
	expect(ns.Renamed()).toBe("renamed");
	expect(Object.keys(ns).sort()).toEqual([
		"Renamed",
		"localDefault",
		"namedAsDefault",
		"namespaceDefault",
		"renamedDefault",
		"variant"
	]);
});

for (const [shape, passthrough, real] of [
	["`export { default } from`", "lib/button/index.js", "lib/button/button.js"],
	[
		"`export { x as default } from`",
		"lib/named-as-default/index.js",
		"lib/named-as-default/real.js"
	],
	[
		"a local `export default`",
		"lib/local-default/index.js",
		"lib/local-default/real.js"
	],
	[
		"`export default` of a namespace import",
		"lib/namespace-default/index.js",
		"lib/namespace-default/real.js"
	]
]) {
	it(`should skip a star passthrough that also has ${shape}`, () => {
		expect(skippedFromBarrel(real)).toBe(true);
		expect(find(passthrough).usedExports).toBe(false);
	});
}

it("should keep a star passthrough that re-exports default under another name", () => {
	expect(skippedFromBarrel("lib/renamed-default/real.js")).toBe(false);
	expect(find("lib/renamed-default/index.js").usedExports).not.toBe(false);
});
