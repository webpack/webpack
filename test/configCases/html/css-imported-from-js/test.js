const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should emit a <link rel=stylesheet> for the entry chunk's CSS file, copying CSP/fetch attributes from the originating <script>", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();

	// The entry chunk emits both the JS chunk and a sibling `.css` —
	// both must be referenced from the extracted HTML.
	const scriptMatch = extracted.match(/<script\b[^>]*src="([^"]+)"[^>]*>/);
	expect(scriptMatch).not.toBeNull();
	expect(scriptMatch[1]).toMatch(/\.js$/);
	// The original `<script>` tag's attributes are preserved verbatim —
	// only its `src` value gets rewritten to the entry chunk URL.
	const scriptTag = scriptMatch[0];
	expect(scriptTag).toContain('nonce="test-nonce"');
	expect(scriptTag).toContain('crossorigin="anonymous"');
	expect(scriptTag).toContain('referrerpolicy="origin"');
	expect(scriptTag).toContain("defer");
	expect(scriptTag).toContain('integrity="sha384-IGNOREME"');

	const linkMatch = extracted.match(/<link rel="stylesheet"[^>]*>/);
	expect(linkMatch).not.toBeNull();
	const linkTag = linkMatch[0];
	const hrefMatch = linkTag.match(/href="([^"]+)"/);
	expect(hrefMatch).not.toBeNull();
	expect(hrefMatch[1]).toMatch(/\.css$/);
	// CSP / fetch attributes propagate from the originating `<script>`
	// onto the emitted `<link>` so the stylesheet inherits the same
	// CSP nonce and credentials policy.
	expect(linkTag).toContain('nonce="test-nonce"');
	expect(linkTag).toContain('crossorigin="anonymous"');
	expect(linkTag).toContain('referrerpolicy="origin"');
	// `defer`/`async`/`type` don't apply to `<link rel="stylesheet">`
	// and `integrity` is content-specific to the original script, so
	// none of them should bleed onto the emitted stylesheet tag.
	expect(linkTag).not.toContain("defer");
	expect(linkTag).not.toContain("integrity");

	// The `<link>` must precede the `<script>` so the browser starts the
	// stylesheet download before the script download — otherwise scripts
	// race ahead and the stylesheet's render-blocking arrival is pushed
	// out (the html-webpack-plugin#1813 concern, applied to JS-imported
	// CSS in HTML entries).
	const scriptIdx = extracted.indexOf("<script");
	const linkIdx = extracted.indexOf('<link rel="stylesheet"');
	expect(linkIdx).toBeGreaterThan(-1);
	expect(linkIdx).toBeLessThan(scriptIdx);

	// The referenced files actually exist on disk.
	expect(() => readFile(scriptMatch[1])).not.toThrow();
	const css = readFile(hrefMatch[1]);
	expect(css).toContain("color: green");
});
