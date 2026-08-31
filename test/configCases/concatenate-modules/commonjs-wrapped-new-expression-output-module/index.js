import { readFileSync } from "fs";
import { construct as constructLoose } from "./loose.js";
import { construct as constructStrict, ctor } from "./strict.mjs";

it("should construct through a strict ESM default import", () => {
	const thing = constructStrict({ a: 1 });

	expect(thing.options).toEqual({ a: 1 });
	expect(thing).toBeInstanceOf(ctor);
});

it("should construct through the javascript/auto interop", () => {
	const thing = constructLoose({ b: 2 });

	expect(thing.options).toEqual({ b: 2 });
	expect(thing).toBeInstanceOf(ctor);
});

it("should emit both constructions with the callee parenthesized", () => {
	const source = readFileSync(__filename, "utf-8");

	expect(source).toMatch(/new \(thing_namespaceFn\(\)\)\(options\)/);
	expect(source).toMatch(/new \(thing_default\(\)\(\)\)\(options\)/);
});
