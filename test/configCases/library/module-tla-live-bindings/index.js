import * as library from "./library.mjs";

it("should keep wrapped entry exports live", () => {
	expect(library.own).toBe(0);
	expect(library.incrementOwn()).toBe(0);
	expect(library.own).toBe(1);
});

it("should keep reexports and aliases live through every write", () => {
	expect(library.count).toBe(0);
	expect(library.increment()).toBe(0);
	expect(library.count).toBe(1);
	expect(library.alias).toBe(1);
	expect(library.assign(3)).toBe(3);
	expect(library.count).toBe(3);
	expect(library.shadow(10)).toBe(11);
	expect(library.count).toBe(3);
	library.destructure({ count: 5 }, () => {
		expect(library.count).toBe(5);
	});
	const seen = [];
	library.iterate([6, 7], () => seen.push(library.count));
	expect(seen).toEqual([6, 7]);
	expect(library.alias).toBe(7);
	expect(library.default).toBe(7);
	expect(library.nested()).toBe(7);
	expect(library.otherCount).toBe(7);
	expect(library.count).toBe(8);
});

it("should preserve inferred names when assigning anonymous functions", () => {
	library.replaceCallable();
	expect(library.callable.name).toBe("callable");
	library.defaultCallable();
	expect(library.callable.name).toBe("callable");
});

it("should publish asynchronous and partially completed writes", async () => {
	library.assign(10);
	await library.incrementLater();
	expect(library.count).toBe(12);
	expect(() => library.partialAssignment()).toThrow();
	expect(library.count).toBe(20);
});

it("should preserve earlier module rendering hooks", () => {
 expect(library.renderedValue()).toBe("after rendering");
});

it("should observe writes using lexical binding identity", () => {
 expect(library.updateLate()).toBe(2);
 expect(library.late).toBe(2);
 expect(library.patternTwice()).toBe(31);
 expect(library.count).toBe(31);
 expect(() => library.assignFixed()).toThrow(TypeError);
 expect(library.fixed).toBe(42);
 const seen = [];
 library.keys({ first: 1, second: 2 }, () => seen.push(library.count));
 expect(seen).toEqual(["first", "second"]);
 library.defaultClass();
 expect(library.callable.name).toBe("callable");
});

it("should preserve renamed local bindings", () => {
 expect(library.updateCollision()).toBe(1);
 expect(library.collision).toBe(2);
});
