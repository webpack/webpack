import { foo, bar } from "./module";
import value from "./other-user";

it("should invalidate when mangled name change", () => {
	expect(foo).toBe("foo");
	expect(bar).toBe("bar");
	expect(value).toBe(42);
});

it("should invalidate when mangled name change (cjs)", () => {
	expect(require("./module-cjs").foo).toBe("foo");
	expect(require("./module-cjs").bar).toBe("bar");
	expect(value).toBe(42);
});
