const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const url = require("./photo.jpg");

// Step 1 changes only this, so the image is not rebuilt and its rename has to
// come back from the retained build info.
require("./changing-file");

it("should reference the renamed asset from the bundle", () => {
	expect(url).toMatch(/photo\.webp$/);
});

it("should emit the renamed asset and not the original", () => {
	const names = STATS_JSON.assets.map((asset) => asset.name);

	expect(names).toContain("photo.webp");
	expect(names).not.toContain("photo.jpg");
});

it("should rebuild the image only when it changed", () => {
	const image = STATS_JSON.modules.find(
		(module) => module.name === "./photo.jpg"
	);

	expect(image.built).toBe(WATCH_STEP !== "1");
});

it("should keep the rename across rebuilds and follow the new bytes", () => {
	const emitted = fs.readFileSync(path.join(__dirname, "photo.webp"));

	expect(emitted.subarray(0, 4).toString()).toBe("RIFF");
	expect(emitted.subarray(8, 12).toString()).toBe("WEBP");
	expect(emitted.subarray(12, 16).toString()).toBe("VP8L");
	expect(emitted.toString()).toContain(
		WATCH_STEP === "2" ? "photo-v2" : "photo-v1"
	);
});
