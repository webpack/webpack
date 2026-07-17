import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should leave unresolvable @custom-media references untouched and warn", () => {
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	// Unsupported / unknown / invalid / non-leading references stay as authored.
	expect(css).toContain("(--always)");
	expect(css).toContain("(--undefined-mq)");
	expect(css).toContain("(--defined: 1px)");
	expect(css).toContain("(--nested)");
	expect(css).toContain("(min-width: 1px) and (--tvish)");
	// The definitions themselves are still removed, malformed ones included.
	expect(css).not.toContain("@custom-media");
	expect(css).not.toContain("@custom-selector");
});
