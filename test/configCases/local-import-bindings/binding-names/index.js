import defaultExport, { CONST_VALUE, letValue, fn } from "./exports";
import * as namespace from "./namespace";

// A direct `eval` resolves names against the scope the module generated, which
// is what a debugger's console and watch expressions read.
const resolve = (name) => eval(name);

it("resolves an imported const binding under its own name", () => {
	expect(resolve("CONST_VALUE")).toBe("const");
	expect(CONST_VALUE).toBe("const");
});

it("resolves a default import under its own name", () => {
	expect(resolve("defaultExport")).toEqual({ kind: "default-expression" });
	expect(defaultExport).toEqual({ kind: "default-expression" });
});

it("resolves a namespace import under its own name", () => {
	// A bare reference is what makes webpack declare the binding; a member
	// access alone reads the import variable and declares nothing.
	expect(Object.keys(namespace).sort()).toEqual(["first", "second"]);
	expect(resolve("namespace").first).toBe(1);
	expect(namespace.second).toBe(2);
});

it("leaves an export the module may reassign reading through the namespace", () => {
	expect(() => resolve("letValue")).toThrow(ReferenceError);
	expect(letValue).toBe("let");
	expect(() => resolve("fn")).toThrow(ReferenceError);
	expect(fn()).toBe("fn");
});
