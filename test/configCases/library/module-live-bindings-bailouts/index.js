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
