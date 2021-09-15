import d from "dll/d";
import { x1, y2 } from "./e";
import { x2, y1 } from "dll/e";
import { B } from "dll/h";

it("should load a module from dll", function() {
	expect(require("dll/a")).toBe("a");
});

it("should load a module of non-default type without extension from dll", function() {
	expect(require("dll/f")).toBe("f");
});

it("should load an async module from dll", function(done) {
	require("dll/b")()
		.then(function(c) {
			expect(c).toEqual(nsObj({ default: "c" }));
			done();
		})
		.catch(done);
});

it("should load an harmony module from dll (default export)", function() {
	expect(d).toBe("d");
});

it("should load an harmony module from dll (star export)", function() {
	expect(x1).toBe(123);
	expect(x2).toBe(123);
	expect(y1).toBe(456);
	expect(y2).toBe(456);
});

it("should load a module with loader applied", function() {
	expect(require("dll/g.abc.js")).toBe("number");
});

it("should give modules the correct ids", function() {
	expect(
		Object.keys(__webpack_modules__)
			.filter(m => !m.startsWith("../.."))
			.sort()
	).toEqual([
		"./index.js",
		"dll-reference ../0-create-dll/dll.js",
		"dll/a.js",
		"dll/b.js",
		"dll/d.js",
		"dll/e.js",
		"dll/e1.js",
		"dll/e2.js",
		"dll/f.jsx",
		"dll/g.abc.js",
		"dll/h.js"
	]);
});

it("should not crash on side-effect-free modules", function() {
	expect(B).toBe("B");
});
