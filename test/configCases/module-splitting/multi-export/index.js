import { eager } from "./lib";

it("splits multiple async-only exports out of the initial chunk", async () => {
	expect(eager).toBe("EAGER_VALUE_123");

	const mod = await import("./route");
	const a = mod.default[0].tag; // runtime values, never source literals
	const b = mod.default[1].tag;
	expect(typeof a).toBe("string");
	expect(typeof b).toBe("string");

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const initial = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);
	expect(initial).not.toContain(a);
	expect(initial).not.toContain(b);
});
