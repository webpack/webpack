import defer * as namespace from "./counter";
import { touched } from "./side-effect";

// A direct `eval` resolves names against the scope the module generated, which
// is what a debugger's console and watch expressions read.
const resolve = (name) => eval(name);

it("leaves a deferred namespace reading through its own expression", () => {
	expect(() => resolve("namespace")).toThrow(ReferenceError);
});

it("keeps the module deferred until the namespace is read", () => {
	expect(touched).toBe(0);
	expect(namespace.NAME).toBe("deferred");
	expect(touched).toBe(1);
});
