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
		'<button class="m_btn  m_primary m_base shell" data-class="btn">'
	);
	expect(body).toContain(
		'<div class="a_card m_less-scoped m_scss-scoped plain global">'
	);
	expect(body).toContain("<div class=a_card>three</div>");
	// A character reference is decoded before the name is looked up.
	expect(body).toContain('<div id="other" class="m_btn">four</div>');
	expect(body).toContain('<div style="color: red" class="">five</div>');
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
