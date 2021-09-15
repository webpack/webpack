import value from "./package";
import aaa from "./aaa";
import bbb from "./bbb";
import ccc from "./ccc";
import ddd from "./ddd";
import { a, b, c, d, e } from "./loader!./loader";

it("should use byDependency defaults", () => {
	expect(value).toBe("module");
});

it("should override byDependency defaults", () => {
	expect(aaa).toBe("index");
});

it("should merge in the correct order", () => {
	expect(bbb).toBe("other");
});

it("should keep byDependency intact", () => {
	expect(ccc).toBe("module");
});

it("should allow to change byDependency", () => {
	expect(ddd).toBe("other");
});

it("should use backward-compat resolve by default in loader", () => {
	expect(a).toBe("require");
	expect(b).toBe("require");
});

it("should allow to override in loader", () => {
	expect(c).toBe("index");
});

it("should allow to use custom dependencyType", () => {
	expect(d).toBe("style");
	expect(e).toBe("default");
});

it("should allow to alias 'byDependency'", () => {
	expect(require("byDependency")).toBe("ok");
});
