import { answer } from "./nice";

it("should not concatenate CommonJS modules when opted out", () => {
	expect(answer).toBe(42);
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(0);
	const module = __STATS__.modules.find((m) => m.name === "./nice.js");
	expect(module.optimizationBailout).toContainEqual(
		expect.stringContaining("not an ECMAScript module")
	);
});
