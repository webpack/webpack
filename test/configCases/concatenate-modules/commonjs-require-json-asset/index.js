import * as consumer from "./consumer";

it("should inline require(json) as the parsed value, without ESM interop", () => {
	expect(consumer.keys).toBe("a,b");
	expect(consumer.dataA).toBe(1);
	// `require()` returns the raw exports, so no `__esModule` marker
	expect(consumer.dataEsModuleFlag).toBeUndefined();
});

it("should inline require() of an asset/source module", () => {
	expect(typeof consumer.svgSource).toBe("string");
	expect(consumer.svgSource).toMatch(/^<svg/);
});

it("should inline require() of an asset/inline module", () => {
	expect(consumer.jpgInline).toMatch(/^data:image\/jpeg;base64,/);
});

it("should inline require() of an asset/resource module", () => {
	expect(consumer.pngUrl).toMatch(/\.png$/);
});

it("should re-export require(json) as the parsed value", () => {
	expect(consumer.dataDirect).toEqual({ a: 1, b: "two" });
	expect(consumer.dataEsModuleFlagDirect).toBeUndefined();
	expect("__esModule" in consumer.dataDirect).toBe(false);
});

it("should re-export require() of an asset module as the raw value", () => {
	expect(typeof consumer.svgSourceDirect).toBe("string");
	expect(consumer.svgSourceDirect).toMatch(/^<svg/);
	expect(consumer.jpgInlineDirect).toMatch(/^data:image\/jpeg;base64,/);
	expect(consumer.pngUrlDirect).toMatch(/\.png$/);
});

it("should concatenate every require() target", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./consumer.js",
		"./data.json",
		"./index.js",
		"./inline.jpg",
		"./resource.png",
		"./source.svg"
	]);
});
