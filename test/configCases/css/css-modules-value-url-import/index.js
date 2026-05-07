import * as style from "./style.module.css";

it("should support @value identifiers as @import URLs and inside url() functions", () => {
	// All three classes should be exported with hashed names.
	expect(style["bg-from-value"]).toMatch(/bg-from-value$/);
	expect(style["bg-from-bare-value"]).toMatch(/bg-from-bare-value$/);
	expect(style["bg-from-single-quoted-value"]).toMatch(
		/bg-from-single-quoted-value$/
	);

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const cssContent = fs.readFileSync(
		path.join(__dirname, "bundle0.css"),
		"utf-8"
	);

	// The @import via @value should pull in `imported.module.css`'s content.
	expect(cssContent).toMatch(/imported-class/);
	expect(cssContent).toMatch(/rebeccapurple/);

	// The url() references should have been resolved against the @value paths
	// — not left as the literal identifier.
	expect(cssContent).not.toMatch(/url\(\s*bgPath\s*\)/);
	expect(cssContent).not.toMatch(/url\(\s*bareBgPath\s*\)/);
	expect(cssContent).not.toMatch(/url\(\s*singleQuotedBgPath\s*\)/);

	// All three should resolve to the same asset URL.
	const matches = [...cssContent.matchAll(/background-image:\s*url\(([^)]+)\)/g)];
	expect(matches).toHaveLength(3);
	const urls = new Set(matches.map((m) => m[1]));
	expect(urls.size).toBe(1);
	expect([...urls][0]).toMatch(/\.png$/);
});
