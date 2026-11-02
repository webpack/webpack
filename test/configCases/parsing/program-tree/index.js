import * as esm from "./esm";
import strict from "./strict-cjs";
import classes from "./this-class";
import { onLiteral, onMember, twice, works } from "./pure";

it("should read the top level from the tree a parse wrote", () => {
	expect(esm[Symbol.toStringTag]).toBe("Module");
	expect(esm.value).toBe(1);
	expect(strict()).toBe(undefined);
	expect(classes).toHaveLength(2);
	expect(works).toBe("1");
	expect(onLiteral).toBe(42);
	expect(onMember).toBe(1);
	expect(twice).toBe("3");
});

it("should write the tree of a program a custom parse returned", () => {
	expect(require("./custom").value).toBe(2);
});
