import Answer, { bar } from "dll/index";

it("should load a module from dll", function() {
	expect(require("dll/index")).toEqual(nsObj({ bar: "bar", default: 42 }));
});

it("should load an harmony module from dll (default export)", function() {
	expect(Answer).toBe(42);
});

it("should load an harmony module from dll (star export)", function() {
	expect(bar).toBe("bar");
});

it("should give modules the correct ids", function() {
	expect(
		Object.keys(__webpack_modules__)
			.filter(m => !m.startsWith("../.."))
			.sort()
	).toEqual([
		"./index.js",
		"dll-reference ../0-create-dll/dll.js",
		"dll/index.js"
	]);
});
