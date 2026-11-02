import * as bindingNamespace from "./binding-namespace";
import * as namespace from "./namespace";

it("re-exports a CommonJS module that re-exports the namespace back", () => {
	expect(Object.keys(namespace)).toEqual(["cjs"]);
	expect(namespace.cjs.esm).toBe(namespace);
	expect(namespace.cjs.esm.__esModule).toBe(true);
});

it("re-exports a CommonJS module that re-exports the namespace back through a binding", () => {
	expect(Object.keys(bindingNamespace)).toEqual(["cjs"]);
	expect(bindingNamespace.cjs.esm).toBe(bindingNamespace);
	expect(bindingNamespace.cjs.esm.__esModule).toBe(true);
});
