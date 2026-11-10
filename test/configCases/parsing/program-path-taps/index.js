import * as esm from "./esm";
import strict from "./strict-cjs";

it("should read the top level through the path", () => {
	expect(esm[Symbol.toStringTag]).toBe("Module");
	expect(esm.value).toBe(1);
	expect(strict()).toBe(undefined);
});

it("should read the directives of a program a custom parse returned", () => {
	expect(require("./custom").value).toBe(2);
});
