import * as library from "./library.mjs";

it("should keep eval results when initializing several exports", () => {
	expect(library.value).toBe(42);
	expect(library.other).toBe(7);
	expect(library.assigned).toBe(43);
	expect(library.fromAssignment).toBe(43);
	expect(library.fromNestedEval).toBe(44);
	expect(library.destructured).toBe(5);
	expect(library.last).toBe(46);
	expect(library.loopPattern).toBe(1);
	expect(library.loopValue).toBe(49);
});

it("should keep direct eval inside exported arrow initializers", () => {
	expect(library.arrow.name).toBe("arrow");
	expect(library.arrow()).toBe(42);
	expect(library.nested()()).toBe(7);
	expect(library.update(45)).toBe(46);
	expect(library.value).toBe(45);
	expect(library.other).toBe(46);
	expect(library.arrow()).toBe(45);
	expect(library.nested()()).toBe(46);
});

it("should close eval calls before an added loop body", () => {
	library.loop();
	expect(library.value).toBe(50);
	expect(library.other).toBe(51);
});
