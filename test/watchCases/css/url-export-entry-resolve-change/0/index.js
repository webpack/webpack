"use strict";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should promote a CSS target from new URL() to a standalone entry", () => {
	const url = new URL("./target", import.meta.url);
	expect(String(url)).not.toMatch(/undefined/);
	expect(url.href).toMatch(/\.css$/);
	const css = fs.readFileSync(
		path.resolve(__dirname, path.basename(url.href)),
		"utf-8"
	);
	expect(css).toContain(".from-css");
});
