import * as library from "./library.mjs";

it("should keep a binding live that a module in another chunk writes", () => {
	expect(library.shared).toBe(1);
	library.bumpShared();
	expect(library.shared).toBe(2);
});

it("should keep a binding live that a module reading it through eval writes", () => {
	expect(library.readEvaluated()).toBe(1);
	expect(library.evaluated).toBe(1);
	library.setEvaluated(2);
	expect(library.readEvaluated()).toBe(2);
	expect(library.evaluated).toBe(2);
});

it("should keep a binding live that eval() writes", () => {
	library.setByEval(3);
	expect(library.evaluated).toBe(3);
	expect(library.onlyEvaluated).toBe(3);
});

it("should miss a write a function created by eval() makes later", () => {
	const write = library.makeLateWriter();
	write(4);
	// the known gap the warning names
	expect(library.evaluated).toBe(3);
	// until the module's next eval() call or write catches up
	expect(library.readEvaluated()).toBe(4);
	expect(library.evaluated).toBe(4);
});
