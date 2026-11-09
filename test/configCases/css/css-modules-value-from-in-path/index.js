import * as style from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should split `@value ... from <source>` on the keyword when the source path contains the substring `from`", () => {
	// Both `@value`s import from `./from-colors.module.css`; the second import
	// name also contains `from`. A `lastIndexOf("from")` split lands inside the
	// path, so the request never resolves and nothing is substituted.
	expect(style.a).toMatch(/a$/);

	const cssContent = fs.readFileSync(
		path.join(__dirname, "bundle0.css"),
		"utf-8"
	);

	// The imported values must be substituted into the declaration, proving the
	// `./from-colors.module.css` request resolved.
	expect(cssContent).toMatch(/color:\s*rebeccapurple/);
	expect(cssContent).toMatch(/padding:\s*10px/);
	expect(cssContent).toMatch(/margin:\s*20px/);
	expect(cssContent).toMatch(/gap:\s*12px/);
	expect(cssContent).toMatch(
		/background:\s*conic-gradient\(from 90deg,\s*red,\s*blue\)/
	);
	expect(cssContent).toMatch(/border-color:\s*rgb\(from rebeccapurple r g b\)/);
	expect(cssContent).toMatch(/--[^:]+:\s*from to/);
	expect(cssContent).toMatch(/@media\s*\(max-width:\s*599px\)/);

	// The identifiers must not survive unsubstituted.
	expect(cssContent).not.toMatch(/color:\s*primary/);
	expect(cssContent).not.toMatch(/padding:\s*theme-from-base/);
	expect(cssContent).not.toMatch(/margin:\s*importedFrom/);
	expect(cssContent).not.toMatch(/gap:\s*color-from/);
});
