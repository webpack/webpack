// read through the external itself: `eval()` here would bail index.js out of
// the concatenation and dissolve the structure under test
import { readFileSync } from "fs";
import { value } from "./mid.js";

it("should resolve a `module` external reached by wrap propagation", () => {
	expect(value).toBe("function");
});

it("should keep a `module` external hoisted as a named import", () => {
	const source = readFileSync(__filename, "utf-8");

	// a `module` external stays hoisted even when wrapping propagates to it: its
	// bindings are imported by name and read directly, instead of a namespace
	// import rebuilt inside a wrapper
	expect(source).toMatch(/import \{ existsSync as \w+/);
	expect(source).not.toMatch(/import \* as \w+ from "fs"/);
	// the JavaScript members did wrap, so propagation really reached the external
	expect(source).toMatch(/esm_user_namespaceFn = /);
	expect(source).toMatch(/mid_namespaceFn = /);
});
