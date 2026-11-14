const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
const body = page.slice(page.indexOf("<body"));

it("should scope a <style module> body", () => {
	expect(page).toMatch(/\.m_btn \{\s*color: red;\s*\}/);
	expect(page).toMatch(/#m_main \{\s*padding: 0;\s*\}/);
	expect(page).toMatch(/\.shell \{\s*color: black;\s*\}/);
	// A plain `<style>` stays global.
	expect(page).toMatch(/\.plain \{\s*color: gray;\s*\}/);
});

it("should run a <style module lang> body through its language's loader", () => {
	expect(page).toContain("css data:text/less;base64,");
	expect(page).toMatch(/\.m_less-scoped \{\s*color: green;\s*\}/);
	expect(page).toContain("css data:text/x-scss;base64,");
	expect(page).toMatch(/\.m_scss-scoped \{\s*color: purple;\s*\}/);
});

it("should rewrite the page's class and id with the module names", () => {
	expect(body).toContain('<body id="m_main">');
	// `composes` adds the composed class; a global one stays as written.
	expect(body).toContain(
		'<button class="m_btn m_primary m_base shell" data-class="btn">'
	);
	expect(body).toContain(
		'<div class="a_card m_less-scoped m_scss-scoped plain global">'
	);
	// The linked `card.module.css` comes first, so its `.card` wins.
	expect(body).toContain("<div class=a_card>three</div>");
	// A character reference is decoded before the name is looked up.
	expect(body).toContain('<div id="other" class="m_btn">four</div>');
	expect(body).toContain('<div style="color: red" class="">five</div>');
	// An unquoted value is quoted once `composes` gives it a space.
	expect(body).toContain('<div class="m_primary m_base">six</div>');
	// A stylesheet its rule makes a CSS module, marked `module`, scopes it too.
	expect(body).toContain('<div class="m_ruled">seven</div>');
});

it("should rewrite the ids other attributes refer to", () => {
	expect(body).toContain('<label for="m_main">eight</label>');
	// Each id of a list is rewritten; an unknown one stays, and `composes`
	// gives an id reference only its own name.
	expect(body).toContain(
		'<input aria-describedby="m_help  m_main unknown" aria-labelledby="unknown" aria-controls="m_primary" list=m_help>'
	);
	expect(body).toContain('<output for="m_help m_main" form="m_main">nine</output>');
	expect(body).toContain(
		'<button popovertarget=m_help commandfor="m_help">ten</button>'
	);
	// A same-page fragment links to an id; another URL's does not.
	expect(body).toContain('<a href="#m_help">eleven</a>');
	expect(body).toContain('<a href="#unknown">twelve</a>');
	expect(body).toContain('<a href="#">thirteen</a>');
	// A fragment is read as a browser reads it: decoded, then percent-decoded.
	expect(body).toContain('<a href="#m_help">encoded</a>');
	expect(body).toContain('<a href="#m_main">percent</a>');
	expect(body).toContain('<a href="#%E0%A4%A">bad-percent</a>');
	// The page's own literal id wins over the percent-decoded one.
	expect(body).toContain('<a href="#%68elp" id="%68elp">literal-percent</a>');
	expect(body).toContain('<a href="&amp;help">not-fragment</a>');
	expect(body).toContain('<a href="https://example.com/#help">fourteen</a>');
	expect(body).toContain(
		'<svg><use href="#m_help"></use><use xlink:href="#m_main"></use></svg>'
	);
	expect(body).toContain('<div data-for="help" title="#help">fifteen</div>');
});

it("should scope a page whose only CSS module is one by its rule", () => {
	const ruled = fs.readFileSync(path.resolve(__dirname, "ruled.html"), "utf-8");
	expect(ruled).toContain('<div class="m_ruled global" id="m_ruled">one</div>');
	expect(ruled).toContain('<label for="m_ruled">two</label>');
	expect(ruled).toContain('<a href="#m_ruled">three</a>');
	expect(ruled).toContain('<template><div class="m_ruled">four</div></template>');
});

it("should leave a webpackIgnore'd element's names as written", () => {
	const ruled = fs.readFileSync(
		path.resolve(__dirname, "ruled-ignore.html"),
		"utf-8"
	);
	expect(ruled).toContain('<div class="m_ruled">one</div>');
	expect(ruled).toContain('<div class="ruled">two</div>');
});

it("should leave a page linking only global sheets", () => {
	const global = fs.readFileSync(path.resolve(__dirname, "global.html"), "utf-8");
	expect(global).toContain('<div class="global ruled" id="ruled">one</div>');
});

it("should scope a linked CSS module and leave a linked global sheet", () => {
	const card = fs.readFileSync(
		path.resolve(__dirname, "card.module.css"),
		"utf-8"
	);
	expect(card).toMatch(/\.a_card \{\s*color: pink;\s*\}/);
	const global = fs.readFileSync(path.resolve(__dirname, "global.css"), "utf-8");
	expect(global).toMatch(/\.global \{\s*color: gray;\s*\}/);
});

it("should generate the page and the linked sheets", () => {
	expect(page).toMatchSnapshot();
	for (const name of ["card.module.css", "by-rule.css", "global.css"]) {
		expect(
			fs.readFileSync(path.resolve(__dirname, name), "utf-8")
		).toMatchSnapshot(name);
	}
});
