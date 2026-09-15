"use strict";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should demote the URL entry when resolve falls through to a non-CSS file", () => {
	const url = new URL("./target", import.meta.url);
	expect(String(url)).not.toMatch(/undefined/);
	expect(url.href).toMatch(/\.txt/);
	const file = path.join(__dirname, "assets", path.basename(url.pathname));
	expect(fs.readFileSync(file, "utf-8")).toContain("from-txt");
});
