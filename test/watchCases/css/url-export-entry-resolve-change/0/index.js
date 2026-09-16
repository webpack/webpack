"use strict";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// Issuer stays untouched across steps; only resolve.extensions target type flips.
it("should keep new URL() valid when the resolved target type changes", () => {
	const url = new URL("./target", import.meta.url);
	expect(String(url)).not.toMatch(/undefined/);
	expect(STATS_JSON.assets.map((a) => a.name)).not.toContain("undefined");

	if (WATCH_STEP === "1") {
		expect(url.href).toMatch(/\.txt/);
		const file = path.join(__dirname, "assets", path.basename(url.pathname));
		expect(fs.readFileSync(file, "utf-8")).toContain("from-txt");
		return;
	}

	expect(url.href).toMatch(/\.css$/);
	const css = fs.readFileSync(
		path.resolve(__dirname, path.basename(url.href)),
		"utf-8"
	);
	expect(css).toContain(".from-css");
});
