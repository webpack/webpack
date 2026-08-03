import { answer } from "./nice";

const { value } = require("./esm-value");
const memberValue = require("./esm-member").value;

it("should not concatenate CommonJS modules when opted out", () => {
	expect(answer).toBe(42);
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(0);
	const module = __STATS__.modules.find((m) => m.name === "./nice.js");
	expect(module.optimizationBailout).toContainEqual(
		expect.stringContaining("not an ECMAScript module")
	);
});

it("should not concatenate require() edges when opted out", () => {
	expect(value).toBe(7);
	expect(memberValue).toBe(9);
	expect(
		__STATS__.modules.find((m) => m.name === "./esm-value.js")
	).toBeDefined();
	expect(
		__STATS__.modules.find((m) => m.name === "./esm-member.js")
	).toBeDefined();
});
