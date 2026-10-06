import { g } from "./shared";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should dispose a module that no longer lives in a runtime its chunk left", () => {
	expect(g()).toBe(1);
	if (WATCH_STEP === "0") {
		STATE.hash = STATS_JSON.hash;
		return;
	}
	// Step 1: `b` stops importing `shared`, so its chunk leaves runtime `b`.
	const manifest = JSON.parse(
		fs.readFileSync(
			path.join(__dirname, `b.${STATE.hash}.hot-update.json`),
			"utf8"
		)
	);
	expect(manifest.r).toContain("shared");
	expect(manifest.m).toContain("./shared.js");
	// It is gone from `b`, so there is no new owner to force-load.
	expect(manifest.f).toBeUndefined();
});
