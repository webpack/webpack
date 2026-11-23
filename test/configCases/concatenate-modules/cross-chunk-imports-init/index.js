import { takeEffects } from "./effects.js";

it("should run each init function where the registry runs its module", async () => {
	const page2 = await import(/* webpackChunkName: "page-2" */ "./page-2.js");
	// default.js is in the same chunk, but no import page-2 loads reaches it
	expect(takeEffects()).toEqual([
		"local-2",
		"declarations",
		"cycle-b",
		"cycle-a",
		"deep",
		"expression",
		"page-2"
	]);
	expect(page2.early).toBe("hoisted");
	expect(page2.both()).toBe("ab");
	expect(page2.expression).toBe("deep 10");
	expect(page2.run()).toEqual(["hoisted", "hoisted"]);
	const page1 = await import(/* webpackChunkName: "page-1" */ "./page-1.js");
	expect(takeEffects()).toEqual(["local-1", "default", "page-1"]);
	expect(page1.run()).toEqual({
		early: "hoisted",
		hoisted: "hoisted",
		count: 1,
		point: 4,
		a: "a",
		c: "c",
		index: 3,
		total: 7,
		nested: "nested",
		key: "only",
		separated: 6,
		name: "default",
		expression: "deep 10",
		both: "ab",
		viaA: "a",
		pair: ["hoisted", "hoisted"]
	});
	const page3 = await import(/* webpackChunkName: "page-3" */ "./page-3.js");
	expect(takeEffects()).toEqual([]);
	expect(page3.name()).toBe("default");
});

if (__STATS_I__ === 0) {
	it("should link every module the pages share through init functions", () => {
		const fs = __non_webpack_require__("fs");
		const path = __non_webpack_require__("path");
		/** @type {Record<string, string[]>} */
		const reasons = {};
		for (const module of __STATS__.children[__STATS_I__].modules) {
			const bailouts = (module.optimizationBailout || []).filter((reason) =>
				reason.startsWith("Cross-chunk imports bailout: ")
			);
			if (bailouts.length > 0) reasons[module.name] = bailouts;
		}
		// a linked module imports only modules of its own chunk
		expect(reasons).toEqual({
			"./shared/expression.js": [
				"Cross-chunk imports bailout: imported module ./deep/deep.js stays in the registry"
			]
		});
		const shared = fs.readFileSync(
			path.join(__dirname, "shared-0.chunk.mjs"),
			"utf-8"
		);
		// pure.js has no side effects, but it reads what declarations.js sets
		for (const name of ["declarations", "default", "pure"]) {
			expect(shared).toMatch(new RegExp(`^function ${name}_init\\(\\) \\{$`, "m"));
		}
		// a function declaration stays outside its module's init function
		expect(shared).toMatch(/^function hoisted\(\) \{$/m);
		// the registry's expression.js calls deep.js's init function where it imports it
		expect(shared).toMatch(
			/^import \{ _\$\d+ as __webpack_linked_\S+ \} from "\.\/deep-0\.chunk\.mjs";$/m
		);
	});
}
