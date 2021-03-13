import globals from "./globals.json?all";
import someGlobals from "./globals.json";

it("should be able to read all properties", () => {
	const walk = o => {
		for (const p of Object.keys(o)) {
			const child = o[p];
			if (typeof child === "object") {
				walk(child);
			} else {
				expect(child).toBeTypeOf("boolean");
			}
		}
	};
	walk(globals);
});

it("should allow accessing some properties with tree-shaking", () => {
	expect(someGlobals.builtin.constructor).toBe(false);
	expect(someGlobals.es5.eval).toBe(false);
	expect(someGlobals.es5.undefined).toBe(false);
	expect(someGlobals.node.global).toBe(false);
	expect(someGlobals.builtin.valueOf).toBe(false);
});
