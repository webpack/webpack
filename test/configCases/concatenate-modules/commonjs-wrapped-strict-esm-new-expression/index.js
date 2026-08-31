import { readFileSync } from "fs";
import {
	call,
	construct,
	constructThroughNamespace,
	constructThroughReexport,
	kind,
	read,
	readInAsiPosition,
	tag
} from "./entry.mjs";

it("should apply `new` to the wrapper accessor's result, not to the accessor", () => {
	const thing = construct({ a: 1 });

	expect(thing.options).toEqual({ a: 1 });
	expect(thing).toBeInstanceOf(read());
});

it("should apply `new` through a namespace default access", () => {
	const thing = constructThroughNamespace({ b: 2 });

	expect(thing.options).toEqual({ b: 2 });
	expect(thing).toBeInstanceOf(read());
});

it("should apply `new` through a re-exported default", () => {
	const thing = constructThroughReexport({ c: 3 });

	expect(thing.options).toEqual({ c: 3 });
	expect(thing).toBeInstanceOf(read());
});

it("should keep the default import readable as a plain value", () => {
	expect(kind).toBe("function");
	expect(read().name).toBe("Thing");
});

it("should call a wrapped default import without extra parentheses", () => {
	expect(call("value")).toBe("value");
	expect(tag("value")).toBe("tag");

	const source = readFileSync(__filename, "utf-8");

	expect(source).toMatch(/return identity_namespaceFn\(\)\(value\)/);
	expect(source).toMatch(/return identity_namespaceFn\(\)`tag\$\{value\}`/);
});

it("should guard an accessor reference that opens an ASI position", () => {
	expect(readInAsiPosition()).toEqual([1]);

	expect(readFileSync(__filename, "utf-8")).toMatch(
		/\n\t;\(thing_namespaceFn\(\)\)\n/
	);
});

it("should really reach the modules through a wrapper accessor", () => {
	const source = readFileSync(__filename, "utf-8");

	expect(source).toMatch(
		/thing_namespaceFn = \/\*#__PURE__\*\/__webpack_require__\.cw\(/
	);
	expect(source).toMatch(/new \(thing_namespaceFn\(\)\)\(/);
});
