import foo from "./foo.js?external";
import bar from "./bar.js";
import baz from "./baz.js?custom-use";
import other from "./other.js";

it("should work with falsy plugins and loaders", function() {
	expect(ONE).toBe("ONE");
	expect(foo.endsWith("?external")).toBe(true);
	expect(bar).toBe("test");
	expect(baz).toBe("test");
	expect(other).toBe("NEW");
});
