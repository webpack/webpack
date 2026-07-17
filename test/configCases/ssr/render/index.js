it("composes the SSR manifest and collected css into a rendered document", async () => {
	// render the page on the server; its async chunk pulls in the page's css
	const page = await import("./page.js");
	const html = page.render();

	// critical css collected during the server render
	const criticalCss = __webpack_css_server_styles__;

	if (typeof document !== "undefined") {
		// browser pass: css is applied to the DOM, the server registry stays empty
		expect(criticalCss).toBe("");
		return;
	}

	// SSR pass: the manifest tells us which client assets to preload for the page
	const fs = require("fs");
	const path = require("path");
	const manifest = JSON.parse(
		fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf8")
	);

	const preloads = manifest["./page.js"]
		.filter((file) => file.endsWith(".mjs"))
		.map((file) => `<link rel="modulepreload" href="${file}">`)
		.join("");

	const doc = `<!doctype html><html><head>${preloads}<style>${criticalCss}</style></head><body>${html}</body></html>`;

	// the collected css is the page's stylesheet, inlined as critical css
	expect(criticalCss).toContain("rebeccapurple");
	// the manifest drove a modulepreload for the page's client chunk
	expect(doc).toMatch(/<link rel="modulepreload" href="page_js[^"]*\.mjs">/);
	// the rendered markup and the inlined critical css are both in the document
	expect(doc).toContain("<style>");
	expect(doc).toContain("rebeccapurple");
	expect(doc).toContain(html);
});
