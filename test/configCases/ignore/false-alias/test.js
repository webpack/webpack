/* globals it */
"use strict";

it("should ignore ignored resources", function() {
	expect(require("./ignored-module")).toEqual({});
});

it("should ignore ignored resources", function() {
	expect(require("ignored-module")).toEqual({});
});

it("should not ignore resources that do not match", function() {
	expect(require("./normal-module")).toBe("normal");
});

it("should describe the ignored module by request", function() {
	const ignored = __STATS__.modules.filter(m =>
		m.identifier.startsWith("ignored|")
	);
	expect(ignored.map(m => m.name).sort()).toEqual([
		"./ignored-module (ignored)",
		"ignored-module (ignored)"
	]);
	for (const module of ignored) {
		expect(module.identifier).toMatch(/^ignored\|.*\|\.?\/?ignored-module$/);
		// the placeholder source is all there is to it
		expect(module.size).toBe("/* (ignored) */".length);
	}
});
