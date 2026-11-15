it("should preserve receivers in a mixed dynamic import context", async () => {
	const name = "cjs";
	const module = await import(`./shared/${name}`);
	expect(module.that().value).toBe(42);
	const dataName = "data.json";
	const json = await import(`./shared/${dataName}`);
	expect(json.default.map(value => value * 2)).toEqual([2, 4, 6]);
});

it("should preserve receivers in a mixed require context", () => {
	const name = "cjs";
	expect(require("./shared/" + name).that().value).toBe(42);
	const dataName = "data.json";
	expect(require("./shared/" + dataName).map(value => value * 2)).toEqual([2, 4, 6]);
});

it("should keep this references when calling a known CommonJS export", () => {
	expect(require("./shared/cjs").that().value).toBe(42);
	const bound = require("./shared/cjs");
	expect(bound.that().value).toBe(42);
});


it("should keep a dynamically imported namespace used as a value", async () => {
	const module = await import("./whole");
	expect(Object.keys(module)).toContain("value");
});

it("should keep a JSON default imported as a value", async () => {
	const module = await import("./shared/data.json?whole-default");
	expect(module.default).toEqual([1, 2, 3]);
});

it("should keep an unknown CommonJS default", async () => {
	const module = await import("./unknown.cjs");
	expect(module.default.value).toBe(42);
});

it("should not unwrap a default property in a require context", () => {
	const name = "default.json";
	const { default: value } = require("./properties/" + name);
	expect(value).toBe(42);
});
