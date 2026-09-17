"use strict";

const fs = require("fs");
const path = require("path");

const findOutputFiles = require("../../../helpers/findOutputFiles");

// Each config in webpack.config.js emits under `cfg${i}/`; the matchers below
// pin the filename shape each template produces. The hash is captured rather
// than length-checked — `hashDigestLength` and `nonNumericOnlyHash` both move it.

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
		// Async CSS lands on disk as `.css` plus a JS wrapper. Returning the wrappers
		// ahead of the main bundle pre-registers the chunks via `runner.require`, so
		// `import()` resolves against them rather than JSDOM's `<script>` loader.
		expect(asyncCss).toBeDefined();
		return [
			`./${dir}/${asyncJs}`,
			`./${dir}/${asyncCssJs}`,
			`./${dir}/${bundle}`
		];
	},
	afterExecute(_options) {
		// `_options` is one option object per config. Every config here shares an
		// `output.path` — the framework defaults each missing one to the same
		// `test/js/.../<testName>/` — so the first answers for all.
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

			// --- No unresolved hash placeholders
			// `[contenthash]`, `[chunkhash]` and `[fullhash]` must all have been
			// substituted; one that survived to disk leaves a literal `[` in a filename.
			for (const f of files) {
				expect(f).not.toMatch(/[[\]]/);
			}

			// --- HTML's rewritten URLs match the actual emitted filenames
			// The html-webpack-plugin#1814 invariant: every URL the page references must
			// resolve to a file that exists, or the browser 404s on it.
			const htmlContent = fs.readFileSync(path.join(dir, html), "utf8");

			const imgMatch = htmlContent.match(/<img src="([^"]+)"/);
			expect(imgMatch).not.toBeNull();
			const linkMatch = htmlContent.match(/<link rel="icon" href="([^"]+)"/);
			expect(linkMatch).not.toBeNull();

			// Resolve each URL against the HTML's own location. `htmlFilename` /
			// `htmlChunkFilename` emit into `cfg${i}/` beside the assets, so a relative
			// `bg.<hash>.png` resolves to `cfg${i}/bg.<hash>.png`.
			const resolveFromHtml = (url) => path.resolve(dir, url);
			expect(fs.existsSync(resolveFromHtml(imgMatch[1]))).toBe(true);
			expect(fs.existsSync(resolveFromHtml(linkMatch[1]))).toBe(true);

			// The HTML's image URL must point at the same emitted file as
			// our regex picked up, not at some other hash variant.
			expect(path.basename(imgMatch[1])).toBe(bg);
			expect(path.basename(linkMatch[1])).toBe(icon);

			// --- CSS's url() reference also resolves to the emitted asset
			// `style.css` references `./bg.png`, which webpack rewrites to the hashed
			// filename — the same invariant, where a drift leaves a dangling URL.
			const cssContent = fs.readFileSync(path.join(dir, css), "utf8");
			const cssUrlMatch = cssContent.match(/url\(([^)]+)\)/);
			expect(cssUrlMatch).not.toBeNull();
			const cssUrl = cssUrlMatch[1].replace(/^["']|["']$/g, "");
			expect(path.basename(cssUrl)).toBe(bg);
			expect(fs.existsSync(path.resolve(dir, cssUrl))).toBe(true);

			// --- Main JS bundle's chunk URL helpers point at real files
			// The other half of html-webpack-plugin#1814: the runtime holds the
			// chunkId-to-hash mapping each chunk's URL is built from, and a drift 404s.
			const bundleContent = fs.readFileSync(path.join(dir, bundle), "utf8");

			// Locate a chunk-URL helper (`u` / `k`), anchored on `chunkId` and the `".<ext>"`
			// tail so arrow, `return` and `function` forms all match. `<expr>` is a per-chunk
			// map, an inlined literal, or an `__webpack_require__.h()` this then follows.
			const extractChunkHashExpr = (prop, ext) => {
				const re = new RegExp(
					`\\.${prop}\\s*=\\s*(?:\\(\\s*chunkId\\s*\\)|function\\s*\\(\\s*chunkId\\s*\\))[\\s\\S]*?(?:return|=>)\\s*\\(?\\s*"[^"]+"\\s*\\+\\s*chunkId\\s*\\+\\s*"\\."\\s*\\+\\s*([\\s\\S]*?)\\s*\\+\\s*"\\.${ext}"\\)?;`
				);
				const m = bundleContent.match(re);
				return m ? m[1] : null;
			};

			const resolveHashFn = () => {
				const m = bundleContent.match(
					/__webpack_require__\.h\s*=\s*(?:\(\s*\)|function\s*\(\s*\))\s*(?:=>\s*)?\(?\s*\{?\s*(?:return\s+)?"([a-f0-9]+)"/
				);
				expect(m).not.toBeNull();
				return /** @type {RegExpMatchArray} */ (m)[1];
			};

			const collectPairs = (expr, soloChunkName) => {
				/** @type {[string, string][]} */
				const pairs = [];
				const mapMatch = expr.match(/^\{([^}]+)\}\[chunkId\]$/);
				const literalMatch = expr.match(/^"([a-f0-9]+)"$/);
				const fullhashFnMatch = expr.match(/^__webpack_require__\.h\(\)$/);
				if (mapMatch) {
					const pairRe = /"([^"]+)":"([a-f0-9]+)"/g;
					let pairMatch;
					while ((pairMatch = pairRe.exec(mapMatch[1])) !== null) {
						pairs.push([pairMatch[1], pairMatch[2]]);
					}
				} else if (literalMatch) {
					pairs.push([soloChunkName, literalMatch[1]]);
				} else if (fullhashFnMatch) {
					pairs.push([soloChunkName, resolveHashFn()]);
				} else {
					throw new Error(`unrecognized chunk-URL hash expression: ${expr}`);
				}
				return pairs;
			};

			// `__webpack_require__.u` — JS chunks. With `async.js` and `async.css` both
			// reachable the helper resolves at minimum to `async_js`; the per-chunk map
			// form additionally lists `async_css`'s JS wrapper.
			const uHashExpr = extractChunkHashExpr("u", "js");
			expect(uHashExpr).not.toBeNull();
			const jsExpectedPairs = collectPairs(
				/** @type {string} */ (uHashExpr),
				"async_js"
			);
			expect(jsExpectedPairs.length).toBeGreaterThan(0);
			for (const [chunkName, chunkHash] of jsExpectedPairs) {
				expect(
					fs.existsSync(path.join(dir, `async.${chunkName}.${chunkHash}.js`))
				).toBe(true);
			}

			// `__webpack_require__.k` — CSS chunks. Only the async CSS chunk
			// is reachable here, so the hash expression collapses to the
			// inlined-literal or fullhash-helper form.
			const kHashExpr = extractChunkHashExpr("k", "css");
			expect(kHashExpr).not.toBeNull();
			const cssExpectedPairs = collectPairs(
				/** @type {string} */ (kHashExpr),
				"async_css"
			);
			expect(cssExpectedPairs.length).toBeGreaterThan(0);
			for (const [chunkName, chunkHash] of cssExpectedPairs) {
				expect(
					fs.existsSync(path.join(dir, `async.${chunkName}.${chunkHash}.css`))
				).toBe(true);
			}
		}
	}
};
