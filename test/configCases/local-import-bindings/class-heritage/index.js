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

it("should give up the binding for a name a class of that name extends", () => {
	// The clause is walked before the class name enters scope, so the whole
	// module keeps reading the namespace for that name rather than tracking
	// which references the class shadows.
	expect(() => resolve("Base")).toThrow(ReferenceError);
	expect(() => resolve("Untouched")).toThrow(ReferenceError);
	expect(typeof Base).toBe("function");
	expect(Untouched).toBe("untouched");
	expect(typeof noSelfReference()).toBe("function");
});
