"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const page = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);
		expect(page).toMatchSnapshot();

		// The body is minified as the document it is: comment gone, attribute
		// unquoted, end tag implied, and `<` needs no escape inside an attribute.
		expect(page).toContain('srcdoc="<p class=a>hi"');
		// The source delimiter is kept where it costs nothing.
		expect(page).toContain("srcdoc='<b>bold</b>'");
		// An `<iframe>` inside one is minified too, and re-escaped for its level.
		expect(page).toContain("srcdoc='<iframe srcdoc=\"<i>deep</i>\"></iframe>'");
		// The nested CSS minifier reaches a `<style>` in there, as it does outside.
		expect(page).toContain("<style>.a{color:red}</style>");
		// A whole document, doctype and all.
		expect(page).toContain(
			'srcdoc="<!doctype html><body><p>whole</body></html>"'
		);
		// The attribute name is matched case-insensitively, like every other.
		expect(page).toContain('srcdoc="<em>up</em>"');
		// A `"` in the body is dropped with the quotes around the value it sat in.
		expect(page).toContain('srcdoc="<p title=q>quoted"');
		// `&lt;` keeps an escape so it still reads as one; a `&` that opens no
		// reference needs none, and renders as itself either way.
		expect(page).toContain('srcdoc="<p>a & b &amp;lt; c"');

		// Both nested languages reach a srcdoc: a conditional comment in there is
		// minified as one, not left as the text of an attribute.
		expect(page).toContain(
			'srcdoc="<!--[if IE]><p class=ie>downlevel<![endif]-->"'
		);

		// A document cannot sit in an unquoted value — a space or a `>` would end
		// the attribute, taking the one after it with it — so it gains quotes.
		expect(page).toContain('<iframe id=bare srcdoc="<p>bare" title=after>');

		// The body is put back by offset: this one also reads inside its own
		// condition, which a text search would rewrite instead.
		expect(page).toContain("<!--[if  IE ]>IE <![endif]-->");

		// Nothing to minify, and nothing invented.
		expect(page).toContain("<iframe id=empty srcdoc>");
		expect(page).toContain("<iframe id=none src=child.html>");
		expect(page).toContain("the word srcdoc in text is not an attribute");

		// The attribute belongs to an HTML `<iframe>`. On anything else the name
		// means nothing, so the value is left as the string it is.
		expect(page).toContain("<!-- kept --><p   >div</p>");
		expect(page).toContain("<!-- kept --><p   >svg</p>");
	}
};
