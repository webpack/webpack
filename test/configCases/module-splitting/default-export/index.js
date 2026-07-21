import { eager } from "./lib";

it("moves an async-only default export out of the initial chunk", async () => {
	expect(eager).toBe("EAGER_VALUE_123");

	const mod = await import("./route");
	// `payload` is only ever a runtime value here, never a source literal.
	const payload = mod.default.payload;
	expect(typeof payload).toBe("string");

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const initial = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);

	// The async-only default payload must not sit in the initial chunk.
	expect(initial).not.toContain(payload);
});
