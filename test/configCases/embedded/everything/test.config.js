"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(i) {
		return i === 0 ? ["main.js"] : ["types.js"];
	},
	afterExecute(options) {
		// An array config hands the array over, and every config here shares one
		// output directory.
		const [{ output }] = Array.isArray(options) ? options : [options];
		/**
		 * @param {string} name an emitted file
		 * @returns {string} its contents
		 */
		const read = (name) =>
			fs.readFileSync(path.join(output.path, name), "utf8");

		const entryPage = read("page-entry.html");
		const assetPage = read("page-asset.html");
		const sheet = read("main.css");
		const types = read("types.js");
		const bundle = read("main.js");

		expect({ entryPage, assetPage, sheet }).toMatchSnapshot();

		// A document is minified whether webpack parses it as an entry or only
		// emits it, and so is every body it nests — two deep for the SVG in the
		// `<style>`'s own `data:` url.
		for (const [page, name] of [
			[entryPage, "entry"],
			[assetPage, "asset"]
		]) {
			expect(page).toContain(`<style>.${name}Style{`);
			expect(page).toContain("<p style=color:#0f0>hi</p>");
			expect(page).toContain(
				`<script type=application/json>{"${name}Json":1}</script>`
			);
			expect(page).toContain(
				'<svg viewBox="0 0 2 2"> <rect fill=red /> </svg>'
			);
			expect(page).toContain(
				`<iframe srcdoc="<style>.${name}Srcdoc{color:#00f}</style>">`
			);
			expect(page).toContain(
				"url(\"data:image/svg+xml,<svg> <rect fill='red' /> </svg>\")"
			);
		}

		// An entry is parsed, so its inline `<script>` becomes a chunk of its own;
		// an emitted-only document is not, so the script stays where it was written
		// and terser is what reaches it.
		expect(entryPage).toContain("<script src=");
		expect(assetPage).toContain(
			"<script>var assetScript=1;function f(){return assetScript}</script>"
		);

		// The stylesheet the default export type emits carries the same payloads.
		expect(sheet).toContain("@import url(data:text/css,.imported{color:red})");
		expect(sheet).toContain("url(data:image/png;base64,AAAA)");

		// Every `asset/inline` module encoded what came back from its minimizer,
		// not what was written.
		const encoded = [
			...bundle.matchAll(/data:([a-z/+.-]+);base64,([A-Za-z\d+/=]+)/g)
		].map(([, type, data]) => [
			type,
			Buffer.from(data, "base64").toString("utf8")
		]);

		expect(encoded).toContainEqual(["text/css", ".inlineCss{color:red}"]);
		expect(encoded).toContainEqual([
			"text/javascript",
			"var inlineJs=1;function f(){return inlineJs}"
		]);
		expect(encoded).toContainEqual([
			"application/json",
			'{"inlineJson":1,"b":[1,2]}'
		]);
		expect(encoded).toContainEqual([
			"image/svg+xml",
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"> <rect width="10" height="10" /> </svg>'
		]);
		expect(
			encoded.find(
				([type, body]) => type === "text/html" && body.includes("<div class=a>")
			)
		).toBeDefined();

		// `style` and `css-style-sheet` put their stylesheet in the bundle instead
		// of exporting it, each with its own nested `@import` payload minified.
		expect(types).toContain(".sheet_style_css{color:red;margin:10px}");
		expect(types).toContain(".sheet_sheet_css{color:red;margin:10px}");
		expect(types.match(/\.imported\{color:red\}/g)).toHaveLength(2);
	}
};
