import * as values from "./values.js";
import { increment, receiver, value } from "./values.js";
import { read } from "./hoisted.js";
import { read as readWrapped } from "./wrapped.js";

it("should reuse references in hoisted and wrapped modules", () => {
	expect(read()).toBe(2);
	expect(readWrapped()).toBe(2);
	increment();
	expect(value).toBe(2);
	expect(read()).toBe(4);
	expect(readWrapped()).toBe(4);
});

it("should preserve reference flags and call receivers", () => {
	expect(receiver()).toBe("unbound");
	expect(values.receiver()).toBe(value);
	expect(values.object.receiver()).toBe(3);
});

it("should concatenate the modules used by the reference checks", () => {
	const modules = __STATS__.modules.find((module) => module.modules).modules;
	expect(modules.map((module) => module.name).sort()).toEqual([
		"./hoisted.js",
		"./index.js",
		"./values.js",
		"./wrapped.js"
	]);
});
