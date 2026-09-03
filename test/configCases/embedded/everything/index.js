import inlineCss from "./inline.css";
import inlineHtml from "./inline.html";
import inlineJs from "./inline.js";
import inlineJson from "./inline.json";
import inlineSvg from "./inline.svg";
import modulePage from "./page-module.html";
import sheetText from "./sheet-text.css";
import sourceCss from "./source.css";
import sourceHtml from "./source.html";
import sourceJs from "./source.js";
import sourceJson from "./source.json";
import sourceSvg from "./source.svg";
import "./page-asset.html";
import "./sheet-asset.css";

it("minifies every body a document nests", () => {
	expect(modulePage).toMatchSnapshot();
	// An inline `<style>`, a `style` attribute, a JSON `<script>`, an `<svg>`
	// subtree, and the document an `<iframe srcdoc>` holds.
	expect(modulePage).toContain("<style>.moduleStyle{");
	expect(modulePage).toContain("<p style=color:#0f0>hi</p>");
	expect(modulePage).toContain(
		'<script type=application/json>{"moduleJson":1}</script>'
	);
	expect(modulePage).toContain(
		'<svg viewBox="0 0 2 2"> <rect fill=red /> </svg>'
	);
	expect(modulePage).toContain(
		'<iframe srcdoc="<style>.moduleSrcdoc{color:#00f}</style>">'
	);
	// Two deep: the SVG in the `<style>`'s own `data:` url.
	expect(modulePage).toContain(
		"url(\"data:image/svg+xml,<svg> <rect fill='red' /> </svg>\")"
	);
	// A document webpack parses extracts its inline `<script>` into a chunk, so
	// only the emitted-only document reaches a JavaScript minimizer inline.
	expect(modulePage).toContain("<script src=");
});

it("minifies a `data:` payload of every language a media type names", () => {
	expect(sheetText).toMatchSnapshot();
	expect(sheetText).toContain("@import url(data:text/css,.imported{color:red})");
	expect(sheetText).toContain(
		"url(\"data:image/svg+xml,<svg> <rect fill='red' /> </svg>\")"
	);
	expect(sheetText).toContain(
		'url("data:text/html,<div>    <p>hi</p>  </div>")'
	);
	expect(sheetText).toContain('url(\'data:application/json,{"a":1}\')');
	expect(sheetText).toContain("url(data:text/javascript,var\\ a=1;)");
	// Reached through base64 it stays base64: re-encoding it as text would be a
	// different url.
	expect(sheetText).toContain(
		"url(data:image/svg+xml;base64,PHN2Zz4gPHJlY3QgZmlsbD0ncmVkJyAvPiA8L3N2Zz4=)"
	);
	expect(sheetText).toContain(
		"url(data:text/css;base64,LmlubmVye2NvbG9yOnJlZH0=)"
	);
	// A media type naming no language webpack knows keeps its payload.
	expect(sheetText).toContain("url(data:image/png;base64,AAAA)");
	// And the sheet itself is minified, whatever it carries.
	expect(sheetText).toContain(".sheet_text_css{color:red;margin:10px}");
});

it("minifies an `asset/source` module of every language", () => {
	expect(sourceCss).toBe(".sourceCss{color:red}");
	expect(sourceJs).toBe("var sourceJs=1;function f(){return sourceJs}");
	expect(sourceJson).toBe('{"sourceJson":1,"b":[1,2]}');
	expect(sourceSvg).toBe(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"> <rect width="10" height="10" /> </svg>'
	);
	// Whitespace between elements is meaningful, so only the comment goes.
	expect(sourceHtml).toContain("<div class=a>");
	expect(sourceHtml).not.toContain("dropped");
});

it("encodes an `asset/inline` module of every language as a `data:` URI", () => {
	// What each one carries is decoded in test.config.js, where a base64 decoder
	// exists; referencing them here is also what keeps them in the bundle.
	expect(inlineCss).toContain("data:text/css;base64,");
	expect(inlineHtml).toContain("data:text/html;base64,");
	expect(inlineJs).toContain("data:text/javascript;base64,");
	expect(inlineJson).toContain("data:application/json;base64,");
	expect(inlineSvg).toContain("data:image/svg+xml;base64,");
});
