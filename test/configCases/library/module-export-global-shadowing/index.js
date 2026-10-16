import * as library from "./library.mjs";

it("should export a binding without shadowing a global another module reads", () => {
	expect(library.total).toBe(1);
	expect(library.readCommonJs()).toBe(1);
	expect(library.readTotal()).toBe("undefined");
});
