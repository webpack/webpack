import { ran } from "./ran.js";
import "null-value";
import "object-value";
import "null-entry";
import "number-value";

it("keeps modules whose sideEffects value is not a boolean, string or string array", () => {
	expect(ran).toEqual([
		"null-value",
		"object-value",
		"null-entry",
		"number-value"
	]);
});
