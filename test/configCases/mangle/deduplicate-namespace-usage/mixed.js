import { getFirst } from "./first.js";
import { getSecond } from "./second.js";

it("should preserve unmangleable references mixed with namespace escapes", () => {
	const required = require("./library.js");
	expect(required).toBe(getFirst());
	expect(required).toBe(getSecond());
	expect(Object.keys(required).sort()).toEqual([
		"constant",
		"increment",
		"nested",
		"value"
	]);
});
