const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const cspMeta = (html) =>
	(html.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/gi) || []).map(
		(m) => m.match(/content="([^"]*)"/i)[1]
	);

const sha = (algo, body) =>
	`'${algo}-${crypto.createHash(algo).update(body, "utf8").digest("base64")}'`;

// Extract a raw-text element's body without a tag-matching regexp.
const bodyOf = (html, tag) => {
	const start = html.indexOf(">", html.indexOf(`<${tag}`)) + 1;
	return html.slice(start, html.indexOf(`</${tag}>`, start));
};

const inlineStyle = (html) => bodyOf(html, "style");

it("injects no CSP by default", () => {
	expect(cspMeta(readHtml("default.html"))).toHaveLength(0);
});

it("injects a strict baseline plus a hash of the inline <style>", () => {
	const html = readHtml("hash.html");
	const [policy] = cspMeta(html);
	expect(policy).toBeDefined();
	expect(policy).toContain("script-src 'self'");
	expect(policy).toContain("object-src 'none'");
	expect(policy).toContain("base-uri 'self'");
	// the style-src hash matches the exact inline <style> bytes in the output
	expect(policy).toContain(sha("sha256", inlineStyle(html)));
});

it("adds a nonce to injected tags and to the policy", () => {
	const html = readHtml("nonce.html");
	const [policy] = cspMeta(html);
	expect(policy).toContain("'nonce-__NONCE__'");
	expect(html).toMatch(/<style nonce="__NONCE__"/);
});

it("merges a custom directive and honors hashFunction", () => {
	const html = readHtml("policy.html");
	const [policy] = cspMeta(html);
	expect(policy).toContain("img-src 'self' data:");
	// baseline still present
	expect(policy).toContain("object-src 'none'");
	// inline <style> hashed with sha512 (not the default sha256)
	expect(policy).toContain(sha("sha512", inlineStyle(html)));
	expect(policy).not.toMatch(/'sha256-/);
});

it("does not override a page that already declares a CSP", () => {
	const html = readHtml("existing.html");
	// exactly the author's policy, untouched — no injected baseline
	expect(cspMeta(html)).toEqual(["default-src 'none'"]);
	// byte-identical to `src/has-csp.html`
	expect(html).toBe(
		"<!doctype html><html><head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'\"><title>Has</title></head><body></body></html>"
	);
});

it("injects CSP past a non-CSP <meta charset>", () => {
	const html = readHtml("charset.html");
	const metas = cspMeta(html);
	expect(metas).toHaveLength(1);
	expect(metas[0]).toContain(sha("sha256", inlineStyle(html)));
	expect(html).toContain('<meta charset="utf-8">');
});

it("covers an external injected <script src> by 'self' without hashing it", () => {
	const html = readHtml("external-script.html");
	const [policy] = cspMeta(html);
	expect(html).toContain('src="external-script.js"');
	expect(policy).toContain("script-src 'self'");
	expect(policy).not.toMatch(/'sha\d+-/);
});

it("adds the nonce to an injected inline <script>", () => {
	const html = readHtml("nonce-script.html");
	expect(html).toMatch(/<script nonce="__NONCE__">/);
	expect(cspMeta(html)[0]).toContain("'nonce-__NONCE__'");
});

it("hashes an inlined <script> body into script-src", () => {
	const html = readHtml("inline-script.html");
	const [policy] = cspMeta(html);
	const scriptBody = bodyOf(html, "script");
	expect(policy).toContain(sha("sha256", scriptBody));
});

it("prepends the CSP meta on a fragment with no <head>", () => {
	const html = readHtml("fragment.html");
	const [policy] = cspMeta(html);
	// the meta is prepended (before the fragment's own content)
	expect(html.indexOf("Content-Security-Policy")).toBeLessThan(
		html.indexOf("<style")
	);
	// the inline <style> is still hashed
	expect(policy).toContain(sha("sha256", inlineStyle(html)));
});

it("hashes tags as transformTags left them (removed dropped, kept hashed)", () => {
	const html = readHtml("transform.html");
	const [policy] = cspMeta(html);
	// the 2nd <style> was removed — only one <style> remains
	expect(html.match(/<style/g)).toHaveLength(1);
	// the kept <style> got the attribute and is still hashed (its real body)
	expect(html).toContain('<style data-x="1">');
	expect(policy).toContain(sha("sha256", inlineStyle(html)));
	// only the kept style contributes a hash; the removed one contributes none
	expect(policy.match(/'sha256-/g)).toHaveLength(1);
});
