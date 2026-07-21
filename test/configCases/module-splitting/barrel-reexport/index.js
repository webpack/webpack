import { light } from "./barrel";

it("splits a barrel's async-only re-export to the async chunk via origin+facade", async () => {
	expect(light).toBe("LIGHT_VALUE");

	const ns = await import("./barrel");
	expect(ns.light).toBe(light);
	const payload = ns.heavy.payload; // runtime value, never a source literal
	expect(typeof payload).toBe("string");

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const initial = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);
	expect(initial).not.toContain(payload);
});
