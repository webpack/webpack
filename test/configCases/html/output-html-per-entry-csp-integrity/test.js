const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name));
const readHtml = (name) => read(name).toString("utf-8");

const cspContent = (html) => {
	const meta = html.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/i);
	return meta ? meta[0].match(/content="([^"]*)"/i)[1] : null;
};

const integrityTags = (html) =>
	(html.match(/<(?:script|link)\b[^>]*>/gi) || [])
		.map((tag) => ({
			url: (tag.match(/(?:src|href)="([^"]+)"/) || [])[1],
			integrity: (tag.match(/integrity="([^"]+)"/) || [])[1]
		}))
		.filter((tag) => tag.integrity);

const isRealSri = ({ url, integrity }) =>
	integrity.split(" ").every((part) => {
		const algorithm = part.slice(0, part.indexOf("-"));
		return (
			part ===
			`${algorithm}-${crypto.createHash(algorithm).update(read(url)).digest("base64")}`
		);
	});

it("a page without an override inherits csp and integrity", () => {
	const html = readHtml("inherit.html");
	expect(cspContent(html)).toContain("script-src 'self'");
	const tags = integrityTags(html);
	expect(tags).not.toHaveLength(0);
	expect(tags.every(isRealSri)).toBe(true);
});

it("per-entry csp:false turns the CSP meta off for that page only", () => {
	const html = readHtml("csp-off.html");
	expect(cspContent(html)).toBeNull();
	expect(integrityTags(html)).not.toHaveLength(0);
});

it("per-entry integrity:false drops SRI for that page only, leaving no sentinel", () => {
	const html = readHtml("integrity-off.html");
	expect(integrityTags(html)).toHaveLength(0);
	expect(html).not.toContain("__WEBPACK_HTML_INTEGRITY__");
	expect(html).not.toContain("integrity=");
	expect(cspContent(html)).toContain("script-src 'self'");
});

it("per-entry csp object overrides the global policy for that page", () => {
	const content = cspContent(readHtml("csp-policy.html"));
	expect(content).toContain("img-src 'self'");
	expect(cspContent(readHtml("inherit.html"))).not.toContain("img-src");
});

it("an authored page honors its entry's csp and integrity overrides", () => {
	// an authored page is emitted under its source basename
	const html = readHtml("page.html");
	expect(cspContent(html)).toBeNull();
	expect(integrityTags(html)).toHaveLength(0);
	expect(html).not.toContain("__WEBPACK_HTML_INTEGRITY__");
});
