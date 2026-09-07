import { Base, Untouched } from "./exports";

const extend = (fn) => class Base extends fn(Base) {};
const nested = (f, g) => class Base extends f(Base, g(Base)) {};
const noSelfReference = () => class Untouched extends Object {};

// A direct `eval` resolves names against the scope the module generated, which
// is what a debugger's console and watch expressions read.
const resolve = (name) => eval(name);

it("should not capture a heritage reference with the class' own name", () => {
	expect(new (extend((x) => x))()).toBeInstanceOf(Base);
	expect(new (nested((x) => x, (x) => x))()).toBeInstanceOf(Base);
});

it("should still bind the name for references outside the heritage clause", () => {
	expect(resolve("Base")).toBe(Base);
	expect(Untouched).toBe("untouched");
	expect(resolve("Untouched")).toBe("untouched");
	expect(typeof noSelfReference()).toBe("function");
});
