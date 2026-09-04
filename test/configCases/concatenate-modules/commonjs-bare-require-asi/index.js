import { value } from "./entry.js";

const a = require("./a.cjs");
const b = require("./b.cjs");
const Ctor = require("./ctor.cjs");

it("should not merge adjacent require() statements via ASI", () => {
	expect(value).toBe(42);
	expect(a.ran).toBe(true);
	expect(b.ran).toBe(true);
});

it("should not merge a `new require()` statement via ASI", () => {
	const instance = new Ctor();
	expect(instance.ran).toBe(true);
});
