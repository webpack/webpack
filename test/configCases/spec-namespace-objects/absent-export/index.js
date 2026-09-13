import * as ns from "./m.js";

it("should read a name the module does not export as undefined", () => {
	// A name that is not an export is answered by the namespace, so nothing
	// inherited from `Object.prototype` can show through it.
	expect(ns.__proto__).toBe(undefined);
	expect(ns.toString).toBe(undefined);
	expect(ns.constructor).toBe(undefined);
	expect(ns.hasOwnProperty).toBe(undefined);
	expect(ns.valueOf).toBe(undefined);
	expect(ns.notAnExport).toBe(undefined);
	expect(ns.renamedLocal).toBe(undefined);
});

it("should refuse a write to a name the module does not export", () => {
	expect(() => {
		ns.notAnExport = 1;
	}).toThrow(TypeError);
	expect(() => {
		ns.renamedLocal = 1;
	}).toThrow(TypeError);
	expect(ns.notAnExport).toBe(undefined);
});

it("should let a delete of a name the module does not export succeed", () => {
	expect(delete ns.notAnExport).toBe(true);
});

it("should still hand out the names the module does export", () => {
	expect(ns.present).toBe(1);
	expect(ns.renamed).toBe(2);
	expect(Object.getOwnPropertyNames(ns)).toEqual(["present", "renamed"]);
	expect(() => {
		ns.present = 9;
	}).toThrow(TypeError);
});
