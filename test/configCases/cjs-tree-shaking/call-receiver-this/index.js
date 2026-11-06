import * as barrel from "./barrel.js";

it("should keep exports read through this in a namespace method", async () => {
	await import("./barrel.js").then(module => {
		expect(module.ns.read()).toBe(42);
	});
	expect(barrel.ns.read()).toBe(42);
});

it("should keep exports read through this in a required method", () => {
	expect(require("./known.cjs").read()).toBe(42);
	const known = require("./known.cjs");
	expect(known.read()).toBe(42);
});
