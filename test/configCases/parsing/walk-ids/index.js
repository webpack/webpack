import * as esm from "./esm";
import strict from "./strict-cjs";

it("should read the top level from the tree a parse wrote", () => {
	expect(esm[Symbol.toStringTag]).toBe("Module");
	expect(esm.value).toBe(1);
	expect(strict()).toBe(undefined);
});

it("should write the tree of a program a custom parse returned", () => {
	expect(require("./custom").value).toBe(2);
});
