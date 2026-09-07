import * as namespace from "./lib";
import { mutable, fn, CONSTANT } from "./lib";

it("names the expression behind every binding a debugger cannot resolve", () => {
	const fs = require("fs");
	const path = require("path");
	const map = JSON.parse(
		fs.readFileSync(path.join(__dirname, "bundle0.js.map"), "utf-8")
	);

	expect(typeof map.scopes).toBe("string");
	expect(map.scopes.length).toBeGreaterThan(0);
	expect(map.names).toContain("Module");

	// These read through the namespace at runtime, so the map has to say so.
	for (const name of ["mutable", "fn", "namespace"]) {
		expect(map.names).toContain(name);
	}
	expect(
		map.names.filter((name) => name.includes("WEBPACK_IMPORTED_MODULE")).length
	).toBeGreaterThan(0);
	// A binding webpack declared locally resolves under its own name already.
	expect(map.names).not.toContain("CONSTANT");
});

it("keeps the values the bindings name", () => {
	expect(namespace.CONSTANT).toBe("constant");
	expect(mutable).toBe("mutable");
	expect(fn()).toBe("fn");
	expect(CONSTANT).toBe("constant");
});
