// This concat module has size `4`
import { a, b, c } from "./concat1";

// Create one shared concat module that exist in multiple chunks
import cjs from "./cjs-concat";

it("should generate correct specifier pointed to import binding / 1", function () {
	expect(a).toBe("concat1~concat2~external-a");
	expect(b).toBe("concat1~concat2~external-b");
	expect(c).toBe("concat1~concat2~external-c");
	expect(cjs).toBe("foo1~foo2~foo3~foo4");
});
