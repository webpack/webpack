import { value as v1 } from "./module1";
const v2 = require("./module2")

var value = 42;

function inc() {
	value++;
}

 it("multiple inlined modules should be wrapped in IIFE to isolate from other inlined modules and chunk modules", () => {
	expect(value).toBe(42);
	expect(v1).toBe(undefined);
	expect(v2).toBe(undefined);
	inc();
	expect(value).toBe(43);
});
