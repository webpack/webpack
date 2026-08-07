import { eager } from "./lib";

it("splits a heavy export behind an `import *` namespace consumer", async () => {
	expect(eager).toBe("EAGER_VALUE_123");

	const mod = await import("./route");
	expect(mod.keys().sort()).toEqual(["eager", "heavy"]);
	const payload = mod.heavy().tag; // runtime value, never a source literal
	expect(typeof payload).toBe("string");

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const initial = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);
	expect(initial).not.toContain(payload);
});
