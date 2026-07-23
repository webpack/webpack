"use strict";

const crypto = require("crypto");
const HtmlGenerator = require("../lib/html/HtmlGenerator");

/**
 * Drives the single-pass post-processing (collect → inject → mutate → render)
 * the way `HtmlModulesPlugin` does, but without a full build.
 * @param {string} content the HTML
 * @param {{ injected?: EXPECTED_ANY[], csp?: EXPECTED_ANY, mutate?: (tags: EXPECTED_ANY[]) => void }} options options
 * @returns {string} the rendered HTML
 */
const run = (content, { injected = [], csp, mutate } = {}) => {
	const model = HtmlGenerator.collectHtml(content);
	HtmlGenerator.addInjectedTags(model, injected);
	if (mutate) mutate(model.tags);
	return HtmlGenerator.renderHtml(content, model, csp);
};

/** @type {(body: string) => string} */
const sha256 = (body) =>
	`'sha256-${crypto.createHash("sha256").update(body, "utf8").digest("base64")}'`;

describe("HtmlGenerator post-processing", () => {
	it("returns byte-identical output when nothing changes", () => {
		const html = "<!doctype html><html><head></head><body></body></html>";
		expect(run(html, { mutate: () => {} })).toBe(html);
	});

	it("prepends head tags and appends body tags to a fragment with no head/body", () => {
		const out = run("<div>hi</div>", {
			injected: [
				{ tag: "meta", attrs: { name: "h" } },
				{ tag: "script", attrs: { src: "/b.js" }, injectTo: "body" }
			]
		});
		expect(out).toBe(
			'<meta name="h"><div>hi</div><script src="/b.js"></script>'
		);
	});

	it("places injected tags at each injectTo anchor, prepend before append", () => {
		const out = run("<head><title>t</title></head><body><p>x</p></body>", {
			injected: [
				{ tag: "meta", attrs: { name: "a" } },
				{ tag: "link", attrs: { rel: "p" }, injectTo: "head-prepend" },
				{ tag: "b", children: "n", injectTo: "body-prepend" },
				{ tag: "i", children: "z", injectTo: "body" }
			]
		});
		expect(out.indexOf('rel="p"')).toBeLessThan(out.indexOf("<title>"));
		expect(out.indexOf('name="a"')).toBeGreaterThan(out.indexOf("</title>"));
		expect(out.indexOf("<b>n</b>")).toBeLessThan(out.indexOf("<p>"));
		expect(out.indexOf("<i>z</i>")).toBeGreaterThan(out.indexOf("</p>"));
	});

	it("removes, moves and rewrites existing tags", () => {
		const out = run(
			'<head><meta name="drop"><script defer src="/a.js"></script></head><body><p>x</p></body>',
			{
				mutate: (tags) => {
					for (const t of tags) {
						if (t.tag === "meta") t.remove = true;
						if (t.tag === "script") {
							t.attrs.defer = false;
							t.attrs.crossorigin = "anonymous";
							t.injectTo = "body";
						}
					}
				}
			}
		);
		expect(out).not.toContain('name="drop"');
		const head = out.slice(out.indexOf("<head>"), out.indexOf("</head>"));
		const body = out.slice(out.indexOf("<body>"), out.indexOf("</body>"));
		expect(head).not.toContain("<script");
		expect(body).toContain('<script src="/a.js" crossorigin="anonymous">');
		expect(body).not.toContain("defer");
	});

	it("injects a strict CSP meta with a hash of the inline <style>", () => {
		const out = run("<head><style>h1{color:red}</style></head><body></body>", {
			csp: true
		});
		expect(out).toContain('http-equiv="Content-Security-Policy"');
		expect(out).toContain("script-src 'self'");
		expect(out).toContain(sha256("h1{color:red}"));
	});

	it("prepends the CSP meta on a fragment with no head", () => {
		const out = run("<style>a{color:red}</style>", { csp: true });
		expect(out.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(
			true
		);
		expect(out).toContain(sha256("a{color:red}"));
	});

	it("adds a placeholder nonce to existing and injected script/style", () => {
		const out = run("<head><style>x{color:red}</style></head><body></body>", {
			injected: [{ tag: "script", children: "y()" }],
			csp: { nonce: "N" }
		});
		expect(out).toContain('<style nonce="N">');
		expect(out).toContain('<script nonce="N">y()</script>');
		expect(out).toContain("'nonce-N'");
	});

	it("skips hashing an external injected <script src> but still covers 'self'", () => {
		const out = run("<head></head><body></body>", {
			injected: [{ tag: "script", attrs: { src: "/x.js" }, injectTo: "body" }],
			csp: true
		});
		expect(out).toContain("script-src 'self'");
		expect(out).not.toContain("'sha256-");
	});

	it("does not inject when the page already declares a CSP", () => {
		const html =
			'<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'"></head><body></body>';
		expect(run(html, { csp: true })).toBe(html);
	});
});
