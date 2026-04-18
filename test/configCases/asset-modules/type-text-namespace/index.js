import * as ns from "./fixture" with { type: "text" };

it("should have only default in namespace object", () => {
	expect(Object.getOwnPropertyNames(ns)).toHaveLength(1);
	expect(Object.getOwnPropertyNames(ns)[0]).toBe("default");
});

it("should export default as string", () => {
	expect(typeof ns.default).toBe("string");
	expect(ns.default).toContain("262");
});

it("should have only default in dynamic import namespace", async () => {
	const dynamicNs = await import("./fixture" /* webpackMode: "eager" */, {
		with: { type: "text" }
	});
	expect(Object.getOwnPropertyNames(dynamicNs)).toHaveLength(1);
	expect(Object.getOwnPropertyNames(dynamicNs)[0]).toBe("default");
	expect(typeof dynamicNs.default).toBe("string");
	expect(dynamicNs.default).toContain("262");
});
