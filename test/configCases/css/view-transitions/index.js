import * as s from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should scope view-transition-name / -group / -class declaration values", () => {
	expect(s.cardName).toBe("s-cardName");
	expect(s.cardClass).toBe("s-cardClass");
});

it("should scope a dashed view-transition-name as a custom property", () => {
	expect(s.dashedName).toBe("--s-dashedName");
});

it("should not export reserved view-transition keywords", () => {
	expect(s).not.toHaveProperty("none");
	expect(s).not.toHaveProperty("nearest");
});

it("should scope ::view-transition-*() pseudo names consistently with the declarations", () => {
	const cssFile = fs.readdirSync(__dirname).find((f) => f.endsWith(".css"));
	const css = fs.readFileSync(path.join(__dirname, cssFile), "utf-8");
	// Pseudo references resolve to the same scoped name as the declaration, so
	// the transition still matches at runtime.
	expect(css).toContain("::view-transition-group(s-cardName)");
	expect(css).toContain("::view-transition-old(s-cardName)");
	expect(css).toContain("::view-transition-new(s-cardName)");
	expect(css).toContain("::view-transition-image-pair(*.s-cardClass)");
	// Reserved keywords stay untouched.
	expect(css).not.toContain("s-nearest");
	expect(css).not.toContain("s-none");
});
