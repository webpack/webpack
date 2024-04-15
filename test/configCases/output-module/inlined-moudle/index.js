import { value as v1 } from "./module1";
const v2 = require("./module2")
const module3Inc = require("./module3")

var value = 42;

function inc() {
	value++;
}

it("single inlined module should not be wrapped in IIFE", () => {
	expect(value).toBe(42);
	expect(v1).toBe(undefined);
	expect(v2).toBe(undefined);
	expect(module3Inc).toBe(undefined);
	inc();
	expect(value).toBe(43);
});
