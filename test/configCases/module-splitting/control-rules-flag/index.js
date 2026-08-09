import { eager } from "./lib";

it("keeps the async-only export in the initial chunk when splitting is disabled", async () => {
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
	// Splitting is disabled, so the export is NOT moved to the async chunk.
	expect(initial).toContain(payload);
});
