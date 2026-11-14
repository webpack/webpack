const fs = require("fs");
const path = require("path");

const read = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");
const page = read("page.html");
const body = page.slice(page.indexOf("<body"));

it("should name an inline module after its page in development", () => {
	expect(page).toMatch(/\.page_html-style-1-btn \{\s*color: red;/);
	expect(page).toMatch(/\.page_html-style-2-btn \{\s*color: white;/);
	expect(page).not.toMatch(/data_text_css/);
});

it("should read a named module only through its name", () => {
	expect(body).toContain(
		'<button class="page_html-style-1-btn page_html-style-2-btn theme_module_css-title theme_module_css-btn card.missing other.x a.b">one</button>'
	);
	expect(body).toContain('<label for="page_html-style-2-field">two</label>');
	expect(body).toContain(
		'<input id="page_html-style-2-field" aria-describedby="page_html-style-1-help page_html-style-2-field">'
	);
	expect(body).toContain('<a href="#page_html-style-2-field">three</a>');
});

it("should rewrite interestfor", () => {
	expect(body).toContain(
		'<div id="page_html-style-1-help" interestfor="page_html-style-1-help">four</div>'
	);
});

it("should not let a <template> id keep a fragment from its decoded target", () => {
	// The template is inert, so its literal `%68elp` is no target: the link
	// decodes to `help`, which is scoped.
	expect(body).toContain('<a href="#page_html-style-1-help">five</a>');
	// The template's own values are still rewritten.
	expect(body).toContain('<div id="%68elp" class="page_html-style-1-btn">');
});

it("should rewrite url(#id) references", () => {
	expect(body).toContain(
		`<circle fill="url(#page_html-style-1-grad)" stroke="red" clip-path="url('#page_html-style-1-clip')" mask="url(#unknown)" filter="URL( &quot;#page_html-style-1-grad&quot; )">`
	);
	expect(body).toContain('<rect fill="freeze">');
});

it("should rewrite the ids SMIL timings name", () => {
	expect(body).toContain(
		'<animate begin="page_html-style-1-help.click; 2s; page_html-style-1-primary.end+1s; page_html-style-2-field.mouseover" end="1.5s; page_html-style-1-help.repeat(2)">'
	);
});

it("should rewrite the attributes an option adds", () => {
	expect(body).toContain(
		'<div data-target="page_html-style-1-help" data-classes="page_html-style-1-btn page_html-style-1-primary page_html-style-1-base" data-link="#page_html-style-1-help" data-refs="page_html-style-1-help page_html-style-2-field" data-paint="url(#page_html-style-1-grad)" data-other="help">six</div>'
	);
});

it("should find a page's names again as its parse did", () => {
	const rescan = read("rescan.html");
	expect(rescan).toContain(
		'<div class="by-rule_css-ruled" id="by-rule_css-target" data-target="by-rule_css-target">one</div>'
	);
	// `webpackIgnore` keeps an element as written.
	expect(rescan).toContain('<div class="ruled">two</div>');
	// The template's literal id is still no target.
	expect(rescan).toContain('<a href="#by-rule_css-help">three</a>');
	expect(rescan).toContain('<a href="#by-rule_css-help">four</a>');
});

it("should find a fragment page's names again in its context", () => {
	const fragment = read("fragment.html");
	expect(fragment).toContain(
		'<tr><td class="by-rule_css-ruled" data-target="by-rule_css-target">one</td></tr>'
	);
});

it("should generate the pages", () => {
	expect(page).toMatchSnapshot("page");
	expect(read("rescan.html")).toMatchSnapshot("rescan");
	expect(read("fragment.html")).toMatchSnapshot("fragment");
});
