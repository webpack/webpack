import { createRequire } from "module";

it("should warn on unsupported createRequire usage", () => {
	if (typeof __nonexistent__ !== "undefined") {
		const zeroArgs = createRequire();
		const badArg = createRequire(1 + 1);
		let alias;
		alias = createRequire;
		expect([zeroArgs, badArg, alias]).toBeDefined();
	}
	expect(true).toBe(true);
});
