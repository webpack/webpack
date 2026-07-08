const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name)).toString("utf-8");

const scriptTags = (html) => html.match(/<script\b[^>]*>/g) || [];
const linkTags = (html) => html.match(/<link\b[^>]*>/g) || [];
const inlineScripts = (html) => html.match(/<script>[\s\S]*?<\/script>/g) || [];
const inlineStyles = (html) => html.match(/<style>[\s\S]*?<\/style>/g) || [];

it("inline: true inlines all JS chunks as <script> blocks", () => {
	const html = readHtml("bool.html");
	// No external <script src> or <link href> for chunks
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(false);
	expect(linkTags(html).some((t) => t.includes("href="))).toBe(false);
	// At least one inline <script> with real content
	const scripts = inlineScripts(html);
	expect(scripts.length).toBeGreaterThan(0);
	expect(scripts[0]).toMatch(/console\.log/);
});

it("inline: true inlines CSS chunks as <style> blocks", () => {
	const html = readHtml("bool.html");
	const styles = inlineStyles(html);
	expect(styles.length).toBeGreaterThan(0);
	expect(styles[0]).toMatch(/color/);
});

it("inline: RegExp[] skips chunks whose name does not match", () => {
	const html = readHtml("pattern.html");
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(true);
	expect(inlineScripts(html).length).toBe(0);
});

it("inline: RegExp[] inlines only the matching chunk (runtime), serves others normally", () => {
	// [/^runtime$/] matches only the runtime chunk — entry still has a <script src>
	const html = readHtml("match.html");
	expect(inlineScripts(html).length).toBeGreaterThanOrEqual(1);
	// entry chunk served normally
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(true);
});

it("inline: true with runtimeChunk inlines all sibling scripts too", () => {
	const html = readHtml("split.html");
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(false);
	expect(inlineScripts(html).length).toBeGreaterThanOrEqual(2);
});

it("authored HTML entry: <script src> tag is replaced with inline content", () => {
	const html = readHtml("authored.html");
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(false);
	const scripts = inlineScripts(html);
	expect(scripts.length).toBeGreaterThan(0);
});

it("<!-- webpackInline: true --> inlines the tag without output.html.inline", () => {
	const html = readHtml("magic.html");
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(false);
	const scripts = inlineScripts(html);
	expect(scripts.length).toBeGreaterThan(0);
	expect(scripts[0]).toMatch(/console\.log/);
});

it("<!-- webpackInline: true --> with runtimeChunk does not inline sibling runtime", () => {
	const html = readHtml("magic-split.html");
	// entry tag inlined
	expect(inlineScripts(html).length).toBeGreaterThan(0);
	// runtime sibling served normally (forceInline is entry-only)
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(true);
});

it("inline: false serves chunks normally", () => {
	const html = readHtml("no-inline.html");
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(true);
	expect(inlineScripts(html).length).toBe(0);
});

it("inline: [] serves chunks normally", () => {
	const html = readHtml("empty-pattern.html");
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(true);
	expect(inlineScripts(html).length).toBe(0);
});

it("inline: true + integrity does not emit integrity attr on inlined tags", () => {
	const html = readHtml("inline-integrity.html");
	expect(inlineScripts(html).length).toBeGreaterThan(0);
	expect(html).not.toContain("integrity=");
	expect(html).not.toContain("__WEBPACK_HTML_INTEGRITY__");
});

it("inline: true with authored <link rel=stylesheet> entry inlines CSS as <style>", () => {
	const html = readHtml("css-link.html");
	expect(inlineStyles(html).length).toBeGreaterThan(0);
	expect(inlineStyles(html)[0]).toMatch(/color/);
	expect(linkTags(html).some((t) => t.includes("href="))).toBe(false);
});
