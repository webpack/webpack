"use strict";

const fs = require("fs");
const path = require("path");
const {
	html: { HtmlModulesPlugin }
} = require("../../");

// The modern icon set a web app ships: a legacy `favicon.ico`, an
// `apple-touch-icon`, two manifest icons, and a theme color.
const APPLE_TOUCH_SIZE = 180;
const MANIFEST_SIZES = [192, 512];
const THEME_COLOR = "#8ed6fb";

// Resize the source icon to a square `size`. A real plugin does this with an
// image library (sharp / jimp); this example keeps the bytes as-is so it runs
// with no dependency — swap in a resizer for production. This is the one step
// the cache below exists to skip on rebuilds.
const resize = (png, _size) => png;

// Wrap a PNG buffer in a single-image ICO container (header + PNG bytes) — a
// real, dependency-free `favicon.ico`.
const pngToIco = (png) => {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(1, 2); // type: icon
	header.writeUInt16LE(1, 4); // one image
	const entry = Buffer.alloc(16);
	// width/height 0 means 256; planes 1, 32bpp; then size and offset (6 + 16).
	entry.writeUInt16LE(1, 4);
	entry.writeUInt16LE(32, 6);
	entry.writeUInt32LE(png.length, 8);
	entry.writeUInt32LE(22, 12);
	return Buffer.concat([header, entry, png]);
};

// Generates a full favicon set + web app manifest from `src/logo.png`, cached by
// the source's content hash so the generation only reruns when the logo changes,
// and injects all the `<link>`/`<meta>` tags via the `alterAssetTags` hook.
class GenerateFaviconPlugin {
	/**
	 * @param {import("../../").Compiler} compiler the compiler
	 */
	apply(compiler) {
		const NAME = "GenerateFaviconPlugin";
		const { RawSource } = compiler.webpack.sources;
		const source = path.resolve(__dirname, "src/logo.png");

		compiler.hooks.thisCompilation.tap(NAME, (compilation) => {
			compilation.hooks.processAssets.tapPromise(
				{
					name: NAME,
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				async () => {
					const png = fs.readFileSync(source);
					// Rebuild the set when the source changes in watch mode.
					compilation.fileDependencies.add(source);
					const cache = compilation.getCache(NAME);
					const etag = cache.getLazyHashedEtag(new RawSource(png));
					const item = cache.getItemCache("favicon-set", etag);
					let files = await item.getPromise();
					if (!files) {
						/** @type {Record<string, Buffer>} */
						files = {
							"favicon.ico": pngToIco(png),
							"apple-touch-icon.png": resize(png, APPLE_TOUCH_SIZE)
						};
						const icons = MANIFEST_SIZES.map((size) => {
							const src = `icon-${size}.png`;
							files[src] = resize(png, size);
							return { src, sizes: `${size}x${size}`, type: "image/png" };
						});
						files["manifest.webmanifest"] = Buffer.from(
							JSON.stringify({
								name: "webpack HTML example",
								display: "standalone",
								// eslint-disable-next-line camelcase
								theme_color: THEME_COLOR,
								icons
							})
						);
						await item.storePromise(files);
					}
					for (const name of Object.keys(files)) {
						compilation.emitAsset(name, new RawSource(files[name]));
					}
				}
			);

			HtmlModulesPlugin.getCompilationHooks(compilation).alterAssetTags.tap(
				NAME,
				(tags) => {
					tags.push(
						{
							tag: "link",
							attrs: { rel: "icon", sizes: "any", href: "favicon.ico" },
							injectTo: "head"
						},
						{
							tag: "link",
							attrs: {
								rel: "apple-touch-icon",
								sizes: `${APPLE_TOUCH_SIZE}x${APPLE_TOUCH_SIZE}`,
								href: "apple-touch-icon.png"
							},
							injectTo: "head"
						},
						{
							tag: "link",
							attrs: { rel: "manifest", href: "manifest.webmanifest" },
							injectTo: "head"
						},
						{
							tag: "meta",
							attrs: { name: "theme-color", content: THEME_COLOR },
							injectTo: "head"
						}
					);
					return tags;
				}
			);
		});
	}
}

/** @type {import("../../").Configuration} */
const config = {
	// `target: "web"` makes the CSS generator emit `.css` chunks (for the
	// `<link rel="stylesheet">` and the inline `<style>`).
	target: "web",
	entry: {
		// Only an HTML entry point — no JavaScript entry. Its stylesheet,
		// scripts (external and inline), inline style and images are all
		// discovered from the HTML and bundled, and `dist/index.html` is
		// emitted with every reference rewritten.
		page: "./src/index.html"
	},
	experiments: {
		html: true,
		css: true
	},
	// Generates the favicon set + `manifest.webmanifest` (cached) and injects
	// their tags.
	plugins: [new GenerateFaviconPlugin()]
};

module.exports = config;
