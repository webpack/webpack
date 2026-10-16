import * as library from "./library.mjs";

it("should keep exporting what a module in another chunk holds", () => {
	expect(library.shared).toBe(1);
	library.bumpShared();
	expect(library.shared).toBe(1);
});

it("should leave a module reading its bindings through eval as it is", () => {
	expect(library.readEvaluated()).toBe(1);
	expect(library.evaluated).toBe(1);
});
