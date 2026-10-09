import { eager } from "./lib";

it("moves an async-only export out of the initial chunk", async () => {
	expect(eager).toBe("EAGER_VALUE_123");

	const mod = await import("./route");
	// `marker` is only ever a runtime value here, never a source literal, so its
	// presence in the initial bundle can only come from the split-off declaration.
	const marker = mod.default;
	expect(typeof marker).toBe("string");
	expect(marker).not.toBe(eager);

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const initial = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);

	// The async-only export's payload must not sit in the initial chunk.
	expect(initial).not.toContain(marker);
});
