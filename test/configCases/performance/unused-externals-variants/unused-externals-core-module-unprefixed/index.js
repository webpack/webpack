import { join } from "node:path";

it("unused-externals-core-module-unprefixed: should count an unprefixed external used through its 'node:' spelling", () => {
	expect(typeof join).toBe("function");
});
