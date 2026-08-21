import { join } from "path";

it("should count a 'node:' external used through its unprefixed spelling", () => {
	expect(typeof join).toBe("function");
});
