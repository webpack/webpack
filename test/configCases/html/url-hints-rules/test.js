const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");

const linkFor = (file) => {
	const match = page.match(
		new RegExp(`<link [^>]*href="${file.replace(".", "\\.")}"[^>]*>`)
	);
	return match && match[0];
};

it("should scope a rule by test, include and exclude", () => {
	// `include: /\/hero\//` wins for both hero assets; the `.png` rule excludes
	// them, so `pic.png` keeps the hero rule rather than the png one
	expect(linkFor("banner.jpg")).toContain('rel="preload"');
	expect(linkFor("banner.jpg")).toContain('media="(min-width: 800px)"');
	expect(linkFor("pic.png")).toContain('rel="preload"');
	expect(linkFor("pic.png")).toContain('media="(min-width: 800px)"');
	// the png rule applies outside /hero/
	expect(linkFor("a.png")).toContain('rel="prefetch"');
	expect(linkFor("a.png")).toContain('fetchpriority="high"');
});

it("should let a later rule override an earlier one field by field", () => {
	const link = linkFor("inter.woff2");
	// the woff2 rule replaced `as` and added `type`…
	expect(link).toContain('as="font"');
	expect(link).toContain('type="font/woff2"');
	expect(link).toContain('rel="preload"');
	// …but the catch-all rule's fetchPriority survived
	expect(link).toContain('fetchpriority="low"');
});

it("should apply the catch-all rule to every request", () => {
	for (const file of ["banner.jpg", "pic.png", "a.png", "override.png"]) {
		expect(linkFor(file)).toContain('as="image"');
	}
});

it("should skip the default-excluded extensions", () => {
	for (const file of ["site.webmanifest", "robots.txt", "brochure.pdf"]) {
		expect(linkFor(file)).toBeNull();
	}
});

it("should let a magic comment override the matched rules", () => {
	const link = linkFor("override.png");
	// `webpackPreload` wins over the png rule's `prefetch`, and the comment's
	// fetchPriority wins over the catch-all's `low`
	expect(link).toContain('rel="preload"');
	expect(link).toContain('fetchpriority="high"');
});
