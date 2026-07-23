const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const iconLink = (html) => html.match(/<link rel="icon"[^>]*>/i);

const hrefOf = (link) => link[0].match(/href="([^"]+)"/)[1];

// the linked favicon file is actually emitted next to the HTML
const emitted = (href) => fs.existsSync(path.resolve(__dirname, href));

it("injects no favicon by default", () => {
	expect(iconLink(readHtml("default.html"))).toBeNull();
});

it("injects the webpack svg logo when favicon: true", () => {
	const link = iconLink(readHtml("logo.html"));
	expect(link).not.toBeNull();
	expect(link[0]).toContain('type="image/svg+xml"');
	// content-hashed asset name, not the bare source name
	expect(link[0]).not.toContain('href="favicon.svg"');
	expect(hrefOf(link)).toMatch(/^[0-9a-f]{16,}\.svg$/);
});

it("emits the favicon asset with non-empty SVG content", () => {
	const href = hrefOf(iconLink(readHtml("logo.html")));
	expect(emitted(href)).toBe(true);
	const content = fs.readFileSync(path.resolve(__dirname, href), "utf-8");
	expect(content).toMatch(/<svg/i);
	expect(content.length).toBeGreaterThan(0);
});

it("injects no favicon when favicon: false", () => {
	expect(iconLink(readHtml("off.html"))).toBeNull();
});

it("uses a user-provided favicon, content-hashed", () => {
	const link = iconLink(readHtml("custom.html"));
	expect(link).not.toBeNull();
	expect(link[0]).toContain('type="image/svg+xml"');
	expect(hrefOf(link)).toMatch(/^[0-9a-f]{16,}\.svg$/);
});

it("sets the link type from the favicon file format (png)", () => {
	const link = iconLink(readHtml("custom-png.html"));
	expect(link).not.toBeNull();
	expect(link[0]).toContain('type="image/png"');
	expect(emitted(hrefOf(link))).toBe(true);
	expect(hrefOf(link)).toMatch(/^[0-9a-f]{16,}\.png$/);
});

it("supports an object mapping each rel to an icon path", () => {
	const html = readHtml("object.html");
	const icon = html.match(/<link rel="icon"[^>]*>/i);
	const apple = html.match(/<link rel="apple-touch-icon"[^>]*>/i);
	expect(icon).not.toBeNull();
	expect(icon[0]).toContain('type="image/svg+xml"');
	expect(hrefOf(icon)).toMatch(/^[0-9a-f]{16,}\.svg$/);
	expect(apple).not.toBeNull();
	expect(apple[0]).toContain('type="image/png"');
	expect(hrefOf(apple)).toMatch(/^[0-9a-f]{16,}\.png$/);
	expect(emitted(hrefOf(icon))).toBe(true);
	expect(emitted(hrefOf(apple))).toBe(true);
});

it("keeps extra link attributes (sizes/color) and still hashes the href", () => {
	const html = readHtml("attrs.html");
	const apple = html.match(/<link rel="apple-touch-icon"[^>]*>/i);
	const mask = html.match(/<link rel="mask-icon"[^>]*>/i);
	expect(apple[0]).toContain('sizes="180x180"');
	expect(apple[0]).toContain('type="image/png"');
	expect(hrefOf(apple)).toMatch(/^[0-9a-f]{16,}\.png$/);
	expect(emitted(hrefOf(apple))).toBe(true);
	expect(mask[0]).toContain('color="#5bbad5"');
	expect(hrefOf(mask)).toMatch(/^[0-9a-f]{16,}\.svg$/);
	expect(emitted(hrefOf(mask))).toBe(true);
});

it("supports an array of icons under one rel (sizes / media variants)", () => {
	const html = readHtml("array.html");
	const links = html.match(/<link rel="icon"[^>]*>/gi) || [];
	// three <link rel="icon"> tags, one per array entry
	expect(links).toHaveLength(3);
	expect(links[0]).toContain('sizes="16x16"');
	expect(links[1]).toContain('sizes="32x32"');
	expect(links[2]).toContain('media="(prefers-color-scheme: dark)"');
	for (const link of links) expect(emitted(hrefOf([link]))).toBe(true);
});

it("supports a function that receives the page name", () => {
	const link = iconLink(readHtml("fn.html"));
	expect(link).not.toBeNull();
	expect(hrefOf(link)).toMatch(/^[0-9a-f]{16,}\.svg$/);
});

it("does not add a favicon when the authored HTML already declares one", () => {
	const html = readHtml("authored-has-icon.html");
	const links = html.match(/<link rel="icon"[^>]*>/gi) || [];
	// the authored link stays the only one — the webpack logo is not added
	expect(links).toHaveLength(1);
	// the author wrote no type attr; the injected logo would add type="image/svg+xml"
	expect(links[0]).not.toContain("type=");
	expect(hrefOf([links[0]])).toMatch(/^[0-9a-f]{16,}\.svg$/);
});

it("does not inject a favicon into authored HTML (only webpack-generated pages)", () => {
	expect(iconLink(readHtml("authored-no-icon.html"))).toBeNull();
});
