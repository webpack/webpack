import { join } from "node:path";

it("should count an unprefixed external used through its 'node:' spelling", () => {
	expect(typeof join).toBe("function");
});
