"use strict";

const fs = require("fs");
const path = require("path");

const findOutputFiles = require("../../../helpers/findOutputFiles");

// Each config in webpack.config.js emits its assets under `cfg${i}/`. The
// matchers below pin the exact filename shape each template should produce
// once webpack has substituted hashes. The hash is captured (`[a-f0-9]+`)
// rather than asserted on for an exact length, because the digest length
// depends on `output.hashDigestLength` (default 20) and the `nonNumericOnly`
// hash adjustment in `lib/util/nonNumericOnlyHash.js`.

/** @returns {RegExp} bundle matcher */
const bundleRe = () => /^bundle\.main\.[a-f0-9]+\.js$/;
/** @returns {RegExp} async-js chunk matcher (the JS bundle for `./async.js`) */
const asyncJsRe = () => /^async\.async_js\.[a-f0-9]+\.js$/;
/**
 * @returns {RegExp} async-css JS-wrapper matcher — webpack emits a tiny JS
 * shim alongside the .css for any `import("./*.css")`; the shim is what
 * actually executes when the bundle imports the chunk.
 */
const asyncCssJsRe = () => /^async\.async_css\.[a-f0-9]+\.js$/;
/** @returns {RegExp} css matcher */
const cssRe = () => /^bundle\.main\.[a-f0-9]+\.css$/;
/** @returns {RegExp} async-css matcher */
const asyncCssRe = () => /^async\.async_css\.[a-f0-9]+\.css$/;
/** @returns {RegExp} html matcher */
const htmlRe = () => /^page\.[a-f0-9]+\.html$/;
/** @returns {RegExp} bg asset matcher */
const bgAssetRe = () => /^bg\.[a-f0-9]+\.png$/;
/** @returns {RegExp} icon asset matcher */
const iconAssetRe = () => /^icon\.[a-f0-9]+\.png$/;

module.exports = {
	findBundle(i, options) {
		const dir = `cfg${i}`;
		const bundle = findOutputFiles(options, bundleRe(), dir)[0];
		const asyncJs = findOutputFiles(options, asyncJsRe(), dir)[0];
		const asyncCssJs = findOutputFiles(options, asyncCssJsRe(), dir)[0];
		const asyncCss = findOutputFiles(options, asyncCssRe(), dir)[0];
		// Async CSS lands on disk as `.css` + a JS wrapper. Returning the JS
		// wrappers ahead of the main bundle pre-registers the chunks via
		// `runner.require`, so the runtime `import()` resolves against the
		// already-installed chunk rather than the JSDOM `<script>` loader
		// (which can't reach the file:// emit dir under JSDOM).
		expect(asyncCss).toBeDefined();
		return [
			`./${dir}/${asyncJs}`,
			`./${dir}/${asyncCssJs}`,
			`./${dir}/${bundle}`
		];
	},
	afterExecute(_options) {
		// `_options` is the array of option objects (one per config) for a
		// multi-config test. All configs in this case share the same
		// `output.path` (the framework defaults each missing `output.path`
		// to `test/js/.../<testName>/`), so we just take the first.
		const outputPath = (Array.isArray(_options) ? _options[0] : _options).output
			.path;
		for (let i = 0; i < 6; i++) {
			const dir = path.join(outputPath, `cfg${i}`);
			const files = fs.readdirSync(dir);

			// --- Every expected output landed on disk -------------------
			const bundle = files.find((f) => bundleRe().test(f));
			const asyncJs = files.find((f) => asyncJsRe().test(f));
			const css = files.find((f) => cssRe().test(f));
			const asyncCss = files.find((f) => asyncCssRe().test(f));
			const html = files.find((f) => htmlRe().test(f));
			const bg = files.find((f) => bgAssetRe().test(f));
			const icon = files.find((f) => iconAssetRe().test(f));

			expect(bundle).toBeDefined();
			expect(asyncJs).toBeDefined();
			expect(css).toBeDefined();
			expect(asyncCss).toBeDefined();
			expect(html).toBeDefined();
			expect(bg).toBeDefined();
			expect(icon).toBeDefined();

			// --- No unresolved hash placeholders ------------------------
			// `[contenthash]`, `[chunkhash]`, and `[fullhash]` must all
			// have been substituted; if any survived to disk we'd see
			// literal `[` characters in a filename.
			for (const f of files) {
				expect(f).not.toMatch(/[[\]]/);
			}

			// --- HTML's rewritten URLs match the actual emitted filenames
			// This is the html-webpack-plugin#1814 invariant: every URL the
			// HTML page references must resolve to a file that actually
			// exists at that path. If `realContentHash` mis-recomputes a
			// hash, or if a hash placeholder is substituted with the wrong
			// digest, the HTML's `<img src>` / `<link href>` would point at
			// a filename that no asset was emitted under, and the browser
			// would 404. We assert it directly.
			const htmlContent = fs.readFileSync(path.join(dir, html), "utf8");

			const imgMatch = htmlContent.match(/<img src="([^"]+)"/);
			expect(imgMatch).not.toBeNull();
			const linkMatch = htmlContent.match(/<link rel="icon" href="([^"]+)"/);
			expect(linkMatch).not.toBeNull();

			// Resolve the URLs relative to the HTML's location and check
			// each one is a file that actually exists. `htmlFilename` /
			// `htmlChunkFilename` emit the HTML into `cfg${i}/`, the same
			// directory the assets live in, so a relative `<img src>` of
			// `bg.<hash>.png` resolves to `cfg${i}/bg.<hash>.png`.
			const resolveFromHtml = (url) => path.resolve(dir, url);
			expect(fs.existsSync(resolveFromHtml(imgMatch[1]))).toBe(true);
			expect(fs.existsSync(resolveFromHtml(linkMatch[1]))).toBe(true);

			// The HTML's image URL must point at the same emitted file as
			// our regex picked up, not at some other hash variant.
			expect(path.basename(imgMatch[1])).toBe(bg);
			expect(path.basename(linkMatch[1])).toBe(icon);

			// --- CSS's url() reference also resolves to the emitted asset
			// `style.css` references `./bg.png` via `url(...)`, and webpack
			// rewrites it to the hashed filename. Same invariant as the
			// HTML check above — broken hash recomputation would silently
			// produce a dangling URL in the stylesheet.
			const cssContent = fs.readFileSync(path.join(dir, css), "utf8");
			const cssUrlMatch = cssContent.match(/url\(([^)]+)\)/);
			expect(cssUrlMatch).not.toBeNull();
			const cssUrl = cssUrlMatch[1].replace(/^["']|["']$/g, "");
			expect(path.basename(cssUrl)).toBe(bg);
			expect(fs.existsSync(path.resolve(dir, cssUrl))).toBe(true);

			// --- Main JS bundle's chunk URL map points at real files
			// This is the *other* half of html-webpack-plugin#1814: the
			// runtime in the main bundle holds a map from `chunkId` to
			// hashed filename, and if those hashes drift from the actual
			// emitted chunks the browser hits a 404 the moment it tries
			// to lazy-load a chunk. Pull every hash literal that lives
			// inside a `__webpack_require__.{u,k}` (JS) / `__webpack_require__.f.css`
			// (CSS) helper, splice it into the templated filename, and
			// confirm the result is a file that exists.
			const bundleContent = fs.readFileSync(path.join(dir, bundle), "utf8");

			// Locate the JS chunk-URL helper (`__webpack_require__.u`).
			// Three shapes show up across the variants:
			//   a) per-chunk map (multiple chunks, [contenthash]/[chunkhash]):
			//      `+ {"async_js":"<h>","async_css":"<h>"}[chunkId] + ".js"`
			//   b) inlined literal (single chunk):
			//      `+ "<h>" + ".js"`
			//   c) compilation-hash helper ([fullhash]):
			//      `+ __webpack_require__.h() + ".js"`
			// Pattern (a) yields per-chunk hashes we can verify directly;
			// (b) yields one literal hash; (c) defers to the runtime
			// `__webpack_require__.h()`, whose value we read from the
			// emitted runtime block.
			const uHelperMatch = bundleContent.match(
				/\.u\s*=\s*\(chunkId\)\s*=>\s*\{[\s\S]*?return\s+"[^"]+"\s*\+\s*chunkId\s*\+\s*"\."\s*\+\s*([\s\S]*?)\s*\+\s*"\.js";/
			);
			expect(uHelperMatch).not.toBeNull();
			const uHashExpr = uHelperMatch[1];

			/** @type {[string, string][]} */
			const jsExpectedPairs = [];
			const mapMatch = uHashExpr.match(/^\{([^}]+)\}\[chunkId\]$/);
			const literalMatch = uHashExpr.match(/^"([a-f0-9]+)"$/);
			const fullhashFnMatch = uHashExpr.match(/^__webpack_require__\.h\(\)$/);
			if (mapMatch) {
				for (const m of mapMatch[1].matchAll(/"([^"]+)":"([a-f0-9]+)"/g)) {
					jsExpectedPairs.push([m[1], m[2]]);
				}
			} else if (literalMatch) {
				// Only one async JS chunk; we know its name is `async_js`.
				jsExpectedPairs.push(["async_js", literalMatch[1]]);
			} else if (fullhashFnMatch) {
				const hashFnMatch = bundleContent.match(
					/__webpack_require__\.h\s*=\s*\(\s*\)\s*=>\s*\(?\s*"([a-f0-9]+)"/
				);
				expect(hashFnMatch).not.toBeNull();
				jsExpectedPairs.push(["async_js", hashFnMatch[1]]);
			} else {
				throw new Error(`unrecognized chunk-URL hash expression: ${uHashExpr}`);
			}
			expect(jsExpectedPairs.length).toBeGreaterThan(0);
			for (const [chunkName, chunkHash] of jsExpectedPairs) {
				expect(
					fs.existsSync(path.join(dir, `async.${chunkName}.${chunkHash}.js`))
				).toBe(true);
			}
		}
	}
};
