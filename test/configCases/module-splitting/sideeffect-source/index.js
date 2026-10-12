import { eager } from "./lib";

it("does not split a module with top-level side effects (Turbopack gate)", async () => {
	expect(eager).toBe("EAGER_VALUE_123");

	const mod = await import("./route");
	const payload = mod.default; // runtime value, never a source literal
	expect(typeof payload).toBe("string");

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const initial = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);
	// Module has a side effect, so it is not split — export stays initial.
	expect(initial).toContain(payload);
});
