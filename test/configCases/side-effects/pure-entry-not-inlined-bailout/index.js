import { helper } from "./refs-entry.js";

export const value = 42;

it("should still compute", () => {
	expect(helper()).toBe(42);
});

it("should report why the entry's exports cannot be dropped", () => {
	const entry = __STATS__.modules.find((module) =>
		module.name.endsWith("index.js")
	);

	expect(entry.optimizationBailout).toContainEqual(
		expect.stringContaining(
			"Analyzable ESM bailout: the entry is referenced by other modules"
		)
	);
});
