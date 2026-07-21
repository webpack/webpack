import { eager } from "./lib";

it("does not split a mutable `let` export (live binding safety)", async () => {
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
	// `let` is not const, so it is not split — stays in the initial chunk.
	expect(initial).toContain(payload);
});
