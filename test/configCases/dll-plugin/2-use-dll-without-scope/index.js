import d from "../0-create-dll/d";
import { x1, y2 } from "./e";
import { x2, y1 } from "../0-create-dll/e";
import { B } from "../0-create-dll/h";
import { A } from "../0-create-dll/h1";

it("should load a module from dll", function() {
	expect(require("../0-create-dll/a")).toBe("a");
});

it("should load a module of non-default type without extension from dll", function() {
	expect(require("../0-create-dll/f")).toBe("f");
});

it("should load an async module from dll", function(done) {
	require("../0-create-dll/b")()
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
	expect(require("../0-create-dll/g.abc.js")).toBe("number");
});

it("should give modules the correct ids", function() {
	expect(
		Object.keys(__webpack_modules__).filter(m => !m.startsWith("../.."))
	).toEqual([
		"../0-create-dll/a.js",
		"../0-create-dll/b.js",
		"../0-create-dll/d.js",
		"../0-create-dll/e.js",
		"../0-create-dll/e1.js",
		"../0-create-dll/e2.js",
		"../0-create-dll/f.jsx",
		"../0-create-dll/g.abc.js",
		"../0-create-dll/h.js",
		"../0-create-dll/hb.js",
		"./index.js",
		"dll-reference ../0-create-dll/dll.js"
	]);
});

it("should not crash on side-effect-free modules", function() {
	expect(B).toBe("B");
});

it("should be able to reference side-effect-free reexport-only module", function() {
	expect(A).toBe("A");
});
