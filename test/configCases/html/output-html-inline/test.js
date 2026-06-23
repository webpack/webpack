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
