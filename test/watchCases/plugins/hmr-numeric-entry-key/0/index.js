import value from "./value";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should name the update manifest after an entry whose key is a number", () => {
	expect(value).toBe(WATCH_STEP === "0" ? 1 : 2);
	if (WATCH_STEP === "0") {
		STATE.hash = STATS_JSON.hash;
		return;
	}
	const manifest = JSON.parse(
		fs.readFileSync(
			path.join(__dirname, `0.${STATE.hash}.hot-update.json`),
			"utf8"
		)
	);
	expect(manifest.c).toEqual(["0"]);
});
