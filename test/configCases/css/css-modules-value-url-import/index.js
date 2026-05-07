import * as style from "./style.module.css";
import * as importedViaValue from "./imported-via-value.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should support @value identifiers as @import URLs and inside url() functions", () => {
	// All three classes should be exported with hashed names.
	expect(style["bg-from-value"]).toMatch(/bg-from-value$/);
	expect(style["bg-from-bare-value"]).toMatch(/bg-from-bare-value$/);
	expect(style["bg-from-single-quoted-value"]).toMatch(
		/bg-from-single-quoted-value$/
	);

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

	// The local-shape url() refs should resolve to the same asset.
	const re = /background-image:\s*url\(([^)]+)\)/g;
	const matches = [];
	let m;
	while ((m = re.exec(cssContent)) !== null) {
		matches.push(m[1]);
	}
	expect(matches.length).toBeGreaterThanOrEqual(3);
	const localUrls = new Set(matches.slice(0, 3));
	expect(localUrls.size).toBe(1);
	expect([...localUrls][0]).toMatch(/\.png$/);
});

it("should still resolve @value identifiers imported from another file when used in declaration values", () => {
	// `externalColor` is `@value externalColor from "./values.module.css"` and
	// is referenced as a regular declaration value — that path is unchanged
	// by the new @import/url() support and must keep working.
	expect(style["uses-external-color"]).toMatch(/uses-external-color$/);

	const cssContent = fs.readFileSync(
		path.join(__dirname, "bundle0.css"),
		"utf-8"
	);

	// The imported value should be substituted into the declaration.
	expect(cssContent).toMatch(/uses-external-color[\s\S]*color:\s*rebeccapurple/);
});

it("should warn (and not crash) when an imported @value is used as @import URL or inside url()", () => {
	// `imported-via-value.module.css` exercises both unsupported positions —
	// the build emits warnings (asserted via warnings.js) but the rest of the
	// module still parses successfully and exports its classes.
	expect(importedViaValue["uses-external-bg"]).toMatch(/uses-external-bg$/);
});
