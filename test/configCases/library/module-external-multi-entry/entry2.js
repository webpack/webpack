// This concat module has size `3`
import { a, b, c } from "./concat2";

// Create one shared concat module that exist in multiple chunks
import cjs from "./cjs-concat";

it("should generate correct specifier pointed to import binding / 2", function () {
	expect(a).toBe("concat2~external-a");
	expect(b).toBe("concat2~external-b");
	expect(c).toBe("concat2~external-c");
	expect(cjs).toBe("foo1~foo2~foo3~foo4");
});
