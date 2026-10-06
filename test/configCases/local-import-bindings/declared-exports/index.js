import named, { pinned, Pinned, swapped } from "./exports";
import { viaEval } from "./evaluated";

// A direct `eval` resolves names against the scope the module generated, which
// is what a debugger's console and watch expressions read.
const resolve = (name) => eval(name);

it("binds a function and a class their module never writes", () => {
	expect(pinned()).toBe("pinned");
	expect(resolve("pinned")()).toBe("pinned");
	expect(new Pinned()).toBeInstanceOf(Pinned);
	expect(new (resolve("Pinned"))()).toBeInstanceOf(Pinned);
	expect(named()).toBe("default");
	expect(resolve("named")()).toBe("default");
});

it("leaves a declaration the module writes reading through the namespace", () => {
	expect(() => resolve("swapped")).toThrow(ReferenceError);
	expect(swapped()).toBe("second");
});

it("leaves every declaration of a module using eval alone", () => {
	expect(() => resolve("viaEval")).toThrow(ReferenceError);
	expect(viaEval()).toBe("after");
});
