import { render } from "./consumer";

it("should return raw module.exports for require() of modules split into another chunk", () => {
	const result = render();
	// a broken build wraps these in a fake namespace object { default: exports }
	expect(typeof result.url).toBe("string");
	expect(result.url).toMatch(/\.svg$/);
	expect(result.whole).toEqual({ foo: 42, default: "d" });
	expect(result.whole.__esModule).toBeUndefined();
	expect(result.foo).toBe(42);
	expect(result.def).toBe("d");
});

it("should keep the split require() targets outside the concatenation", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./consumer.js",
		"./index.js"
	]);
});
