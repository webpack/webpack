const fs = require("fs");
const path = require("path");

/**
 * @param {string} name the page's entry name
 * @returns {string} the emitted page
 */
const read = (name) =>
	fs.readFileSync(path.resolve(__dirname, `${name}.html`), "utf-8");

it("should keep text spelling an internal marker as text", () => {
	const html = read("text");
	expect(html).toContain(
		"<p id=inline>__WEBPACK_HTML_INLINE__746578742d30__css__END__</p>"
	);
	expect(html).toContain(
		"title=__WEBPACK_HTML_INLINE__746578742d30__javascript__END__>"
	);
	expect(html).toContain("<p id=asset>__WEBPACK_HTML_ASSET_URL__00__END__</p>");
	expect(html).toContain("<p id=auto>__WEBPACK_CSS_PUBLIC_PATH_AUTO__</p>");
	expect(html).toContain(
		'id=frame srcdoc="<p>__WEBPACK_HTML_ASSET_URL__00__END__"></iframe>'
	);
});

it("should keep a sheet's text spelling an internal marker inside the `<style>`", () => {
	const html = read("sheet");
	expect(html).toContain(
		'content:"</sty integrity=\\5F_WEBPACK_HTML_INTEGRITY__73686565742d30__javascript__END__le><b>bold</b>"'
	);
	expect(html.match(/<\/style/gi)).toHaveLength(1);
});

it("should keep a `<` in a URL it writes into an attribute escaped", () => {
	const html = read("noscript");
	expect(html).toContain('.svg?c=&lt;/noscript>&lt;b>bold&lt;/b>"></noscript>');
	expect(html).toMatch(/fill='url\("[^']+\.svg\?a=><b>bold<\/b>"\)'/);
});

it("should not inline into foreign content and keep `</noscript>` escaped", () => {
	const html = read("noscript");
	expect(html).toContain('<style>.closing{content:"<\\/noscript><b>bold</b>"}');
	expect(html.match(/<\/noscript/gi)).toHaveLength(2);
	expect(html).toContain("<math><script src=plain.js></script></math>");
});

it("should keep a license banner's comment closed where it ends", () => {
	const html = read("banner");
	// no `<noscript>` on the page, so a raw template keeps `</noscript>` as written
	expect(html).toContain("String.raw`</noscript>`");
	expect(html).toContain("see a* /window.banner = 1;/*b.js.LICENSE.txt */");
});

it("should escape a URL once per level of `srcdoc` it is written into", () => {
	const html = read("nested");
	expect(html).toContain(
		".svg?a=&amp;amp;amp;quot;&amp;amp;amp;gt;&amp;amp;amp;lt;b&amp;amp;amp;gt;bold"
	);
	expect(html).not.toContain("<b>");
});

it("should keep a sheet's `@charset` and overlapping markers as text", () => {
	const html = read("charset");
	expect(html).not.toMatch(/<b>/i);
	expect(html.match(/<\/style/gi)).toHaveLength(1);
	expect(html).toContain(
		'.overlap{content:"\\5F_WEBPACK_CSS_PUBLIC_PATH_AUTO\\5F_WEBPACK_CSS_PUBLIC_PATH_AUTO__"}'
	);
	expect(html).toContain(
		'.escaped{content:"\\5F_WEBPACK_CSS_PUBLIC_PATH_AUTO__"}'
	);
});

it("should keep text spelling an internal marker in a page exported to JavaScript", () => {
	require("./exported.js");
	expect(window.exportedPage).toBe(
		'<p>__WEBPACK_HTML_ASSET_URL__00__END__<p>__WEBPACK_CSS_PUBLIC_PATH_AUTO__<p title=__WEBPACK_HTML_ASSET_URL__00__END__>a</p>\n'
	);
});

it("should bundle a foreign script whose `<` is a comparison", () => {
	expect(read("foreign")).toContain("<svg><script href=foreign.js></script></svg>");
});

it("should read a foreign body holding a comment or CDATA section by its text", () => {
	const html = read("markup");
	expect(html).toMatch(/rect\{fill:url\([^)]+\.svg\)\}<\/style>/);
	expect(html).toContain("<script href=markup.js></script></svg>");
	const script = fs.readFileSync(path.resolve(__dirname, "markup.js"), "utf-8");
	expect(script).toContain(`window.markupRead="&amp;"`);
	expect(script).toContain("window.markupBoth=2");
});

it("should keep a frame's live template delimiter live and its escaped one escaped", () => {
	expect(read("frame")).toContain(
		'srcdoc="<p>{{live}} &#123;{literal}}</p><img src='
	);
});

it("should keep a foreign script asked to be inlined external", () => {
	expect(read("inline")).toContain("<svg><script href=inline.js></script></svg>");
});

it("should keep `</noscript>` escaped in a sheet inlined after page text spelling a marker", () => {
	const html = read("split");
	expect(html).toContain('content:"<\\/noscript><b>bold</b>"');
	expect(html.match(/<\/noscript/gi)).toHaveLength(1);
});
