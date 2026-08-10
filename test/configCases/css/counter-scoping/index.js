import * as s from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

/**
 * Read an export by computed key so the third config (which does not emit the
 * scoped names) doesn't trip webpack's missing-named-export analysis.
 * @param {string} name export name
 * @returns {string} exported value
 */
const exported = (name) => s[name];

/**
 * @returns {string} the emitted stylesheet
 */
const readCss = () =>
	// All configs emit into the same directory, so read this config's stylesheet.
	fs.readFileSync(path.join(__dirname, `bundle${__STATS_I__}.css`), "utf-8");

// The third config turns `customIdents` off.
const scoped = __STATS_I__ !== 2;

if (scoped) {
	it("should scope counter names declared by counter-reset / -increment / -set", () => {
		expect(exported("section")).toBe("s-section");
		const css = readCss();
		expect(css).toContain("counter-reset: s-section 0 list-item 3");
		expect(css).toContain("counter-increment: s-section");
		expect(css).toContain("counter-set: s-section 1");
	});

	it("should scope counter() / counters() references consistently with the declaration", () => {
		const css = readCss();
		expect(css).toContain("counter(s-section, decimal)");
		expect(css).toContain('counters(s-section, ".", s-thumbs)');
	});

	it("should scope the counter-style argument so it matches the renamed @counter-style", () => {
		expect(exported("thumbs")).toBe("s-thumbs");
		const css = readCss();
		// The @counter-style rule is renamed, so every reference must be renamed
		// too or the custom style silently stops applying.
		expect(css).toContain("@counter-style s-thumbs");
		expect(css).toContain("counter(s-section, s-thumbs)");
		expect(css).toContain("list-style-type: s-thumbs");
		expect(css).not.toContain("counter(s-section, thumbs)");
	});

	it("should scope the name inside counter-reset: reversed()", () => {
		const css = readCss();
		expect(css).toContain("reversed(s-section)");
	});

	it("should resolve an @value-aliased counter name to the same scoped name", () => {
		const css = readCss();
		expect(css).toContain("counter-reset: s-section;");
		expect(css).toContain("counter(s-section)");
	});

	it("should honor the global() / local() escape hatches", () => {
		const css = readCss();
		expect(css).toContain("counter-reset: globalCounter s-localCounter");
		expect(css).toContain("counter(globalCounter)");
		expect(css).toContain("counter(s-localCounter, globalStyle)");
		expect(s).not.toHaveProperty("globalCounter");
		expect(s).not.toHaveProperty("globalStyle");
	});

	it("should scope the counter name and style of target-counter()", () => {
		const css = readCss();
		// The `url()` argument is normalized by the url handling; the counter
		// name and style after it are scoped.
		expect(css).toMatch(
			/target-counter\(url\([^)]*#anchor\), s-section, s-thumbs\)/
		);
	});
} else {
	it("should leave counter and counter-style names global when customIdents is off", () => {
		const css = readCss();
		expect(s).not.toHaveProperty("section");
		expect(s).not.toHaveProperty("thumbs");
		expect(css).toContain("@counter-style thumbs");
		expect(css).toContain("counter-reset: section 0 list-item 3");
		expect(css).toContain("counter-increment: section");
		expect(css).toContain("counter(section, thumbs)");
		expect(css).toContain('counters(section, ".", thumbs)');
		expect(css).toContain("reversed(section)");
		expect(css).toContain("list-style-type: thumbs");
	});
}

it("should scope a dashed counter name as a custom property", () => {
	expect(exported("dashedCounter")).toBe("--s-dashedCounter");
	const css = readCss();
	expect(css).toContain("counter-reset: --s-dashedCounter");
	expect(css).toContain("counter(--s-dashedCounter)");
});

it("should not scope UA counters or reserved keywords", () => {
	expect(s).not.toHaveProperty("none");
	expect(s).not.toHaveProperty("list-item");
	expect(s).not.toHaveProperty("page");
	expect(s).not.toHaveProperty("pages");
	expect(s).not.toHaveProperty("decimal");
	const css = readCss();
	expect(css).toContain("counter-reset: none");
	expect(css).not.toContain("s-list-item");
	expect(css).not.toContain("s-page");
	expect(css).not.toContain("s-decimal");
});
