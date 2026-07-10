const eagerGlobModules = import.meta.glob("./interop/*.js", { eager: true });
const lazyGlobModules = import.meta.glob("./interop/*.js");

const strictNamespaceExpectation = nsObj({
	default: {
		__esModule: true,
		named: "named export",
		default: "default export"
	},
	named: "named export"
});

it("should use strict namespace interop for eager import.meta.glob in ESM", () => {
	const module = eagerGlobModules["./interop/flagged.js"];
	expect(module).toEqual(strictNamespaceExpectation);
});

it("should use strict namespace interop for lazy import.meta.glob in ESM", async () => {
	const module = await lazyGlobModules["./interop/flagged.js"]();
	expect(module).toEqual(strictNamespaceExpectation);
});

it("should match import() namespace interop for the same module", async () => {
	const module = await import("./interop/flagged.js");
	expect(module).toEqual(strictNamespaceExpectation);
});
