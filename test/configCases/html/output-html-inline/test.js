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
	// No external <script src> or chunk <link href> (favicon <link rel="icon"> is expected)
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(false);
	expect(linkTags(html).filter(t => !/rel=["']?icon/i.test(t)).some((t) => t.includes("href="))).toBe(false);
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

it("a malformed magic comment resets a pending webpackInline directive", () => {
	// `<!-- webpackInline: true -->` then a malformed comment then the script:
	// the malformed comment must clear the pending inline, so the script stays external.
	const html = readHtml("magic-inline-reset.html");
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(true);
	expect(inlineScripts(html).length).toBe(0);
});

it("<!-- webpackInline: true --> with runtimeChunk inlines sibling runtime too", () => {
	const html = readHtml("magic-split.html");
	// both entry and runtime sibling are inlined
	expect(inlineScripts(html).length).toBeGreaterThanOrEqual(2);
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(false);
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

it("JS importing HTML module does not leave inline sentinel in the JS chunk", () => {
	const files = fs.readdirSync(__dirname).filter((f) => f.startsWith("js-imports-html.") && f.endsWith(".js"));
	expect(files.length).toBeGreaterThan(0);
	const jsContent = fs.readFileSync(path.resolve(__dirname, files[0]), "utf-8");
	expect(jsContent).not.toContain("__WEBPACK_HTML_INLINE__");
});

it("inline: true with authored <link rel=stylesheet> entry inlines CSS as <style>", () => {
	const html = readHtml("css-link.html");
	expect(inlineStyles(html).length).toBeGreaterThan(0);
	expect(inlineStyles(html)[0]).toMatch(/color/);
	expect(linkTags(html).filter(t => !/rel=["']?icon/i.test(t)).some((t) => t.includes("href="))).toBe(false);
});

it("inline: true escapes </script> so chunk content can't close the block early", () => {
	const html = readHtml("escape.html");
	// The marker sits *after* the `</script>` literal in source; if the raw
	// `</script>` had closed the inline block, it would leak out as loose text
	// instead of staying inside the <script>.
	expect(inlineScripts(html).some((s) => s.includes("__INLINE_MARKER__"))).toBe(
		true
	);
});

it("inline: true escapes </style> so chunk content can't close the block early", () => {
	const html = readHtml("escape.html");
	// `.b { color: green }` follows the `</style>` literal in the CSS source.
	expect(inlineStyles(html).some((s) => s.includes("green"))).toBe(true);
});

it("inline: true escapes <!-- so a following <script can't hide the close", () => {
	const html = readHtml("escape.html");
	// The marker follows a `<!-- ... <script> ... </script> ... -->` sequence; if
	// `<!--` weren't escaped it would open the script-data escaped state and the
	// wrapper's `</script>` would fail to close, leaking the marker as text.
	expect(inlineScripts(html).some((s) => s.includes("__INLINE_MARKER__"))).toBe(
		true
	);
	expect(html).toContain("<\\!--");
});

it("inline: true rebases relative CSS url() to the HTML location", () => {
	const html = readHtml("css-rebase.html");
	const style = inlineStyles(html)[0] || "";
	// The .css lived in styles/, so its `url(./img)` was emitted as `../assets/…`;
	// inlined into the root HTML it must be rebased to `assets/…` (root-relative,
	// like the page's own urls). Both source urls point at the one asset.
	expect(style.match(/url\(assets\//g) || []).toHaveLength(2);
	expect(style).not.toMatch(/url\(\.\.\//);
	// A `data:` URI is absolute and must be left untouched.
	expect(style).toContain("url(data:image/png;base64,AAAA)");
});

it("inline: true rebases root CSS url() when the HTML is in a subdirectory", () => {
	const html = readHtml("sub/css-rebase-sub.html");
	const style = inlineStyles(html)[0] || "";
	// css sits at the root (`assets/…`); from the sub/ page it must gain `../`.
	expect(style.match(/url\(\.\.\/assets\//g) || []).toHaveLength(2);
	expect(style).toContain("url(data:image/png;base64,AAAA)");
});

it("inline: true leaves absolute publicPath CSS urls unrebased", () => {
	const html = readHtml("css-publicpath.html");
	const style = inlineStyles(html)[0] || "";
	expect(style.match(/url\(\/pub\/assets\//g) || []).toHaveLength(2);
	expect(style).not.toMatch(/url\(\.\.?\//);
});

it("inline: a chunk inlined into one page survives when another page links it", () => {
	const a = readHtml("page-a.html");
	// page-a inlines everything via the magic comment — no external scripts
	expect(scriptTags(a).some((t) => t.includes("src="))).toBe(false);
	expect(inlineScripts(a).length).toBeGreaterThanOrEqual(2);
	// the shared chunk is still emitted because page-b references it by URL
	const shared = fs
		.readdirSync(__dirname)
		.filter((f) => /^shared\.[0-9a-f]+\.js$/.test(f));
	expect(shared).toHaveLength(1);
	expect(readHtml("page-b.html")).toContain(shared[0]);
});

it("inline: true deletes a now-unreferenced inlined chunk file", () => {
	const html = readHtml("delcheck.html");
	// the runtime is inlined ...
	expect(inlineScripts(html).length).toBeGreaterThanOrEqual(1);
	// ... and its standalone file is no longer emitted
	const leftover = fs
		.readdirSync(__dirname)
		.filter((f) => f.startsWith("delcheck-runtime."));
	expect(leftover).toHaveLength(0);
});

it('inline: true keeps type="module" on an inlined module-script entry', () => {
	const html = readHtml("module.html");
	expect(html).toContain('<script type="module">');
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(false);
	expect(html).toMatch(/<script type="module">[\s\S]+?<\/script>/);
});

it("inline: true does not inline a <link rel=modulepreload> hint", () => {
	const html = readHtml("modulepreload.html");
	// The preload hint must stay a `<link>` with a URL, not become an inlined
	// (and unclosed) executing `<script>`.
	expect(html).toMatch(/<link[^>]*rel="modulepreload"[^>]*href=/);
	expect(html).not.toContain("__WEBPACK_HTML_INLINE__");
	// The document stays well-formed: `</html>` isn't swallowed into a script.
	expect(inlineScripts(html)).toHaveLength(0);
});

it("inline: true uses a classic <script> when output is not a module", () => {
	// Authored `<script type="module">` but classic-IIFE output: the chunk is
	// not ESM, so the inlined tag must not claim `type="module"`.
	const html = readHtml("module-classic.html");
	expect(html).not.toContain('type="module"');
	expect(inlineScripts(html).length).toBeGreaterThan(0);
	expect(scriptTags(html).some((t) => t.includes("src="))).toBe(false);
});
