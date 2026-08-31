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

it("should call a wrapped default import in call and tagged-template position", () => {
	expect(call("value")).toBe("value");
	expect(tag("value")).toBe("tag");
});

it("should read a wrapped default import opening an ASI position", () => {
	expect(readInAsiPosition()).toEqual([1]);
});
