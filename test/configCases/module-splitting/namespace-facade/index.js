import { eager } from "./lib";

it("splits a heavy default out of a dynamically-imported module via a facade", async () => {
	expect(eager).toBe("EAGER_VALUE_123");

	const ns = await import("./lib");
	// Namespace stays complete and live...
	expect(ns.eager).toBe(eager);
	const payload = ns.default.payload; // runtime value, never a source literal
	expect(typeof payload).toBe("string");
	expect(Object.keys(ns).sort()).toEqual(["default", "eager"]);

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const initial = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);
	// ...but the heavy default payload is not in the initial chunk.
	expect(initial).not.toContain(payload);
});
