const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const iconLink = (html) => html.match(/<link rel="icon"[^>]*>/i);
const scriptRe = /<script[^>]* src="__html_[a-f0-9]+_0\.js"[^>]*>/;

it("per-entry html object with favicon:false overrides output.html", () => {
	const html = readHtml("a.html");
	expect(iconLink(html)).toBeNull();
});

it("per-entry html object with inject:'head' places scripts in <head>", () => {
	const html = readHtml("b.html");
	const head = html.match(/<head>([\s\S]*?)<\/head>/i)[1];
	const body = html.match(/<body>([\s\S]*?)<\/body>/i)[1];
	expect(head).toMatch(scriptRe);
	expect(body).not.toMatch(scriptRe);
});

it("per-entry html object with favicon path emits a custom favicon link", () => {
	const html = readHtml("c.html");
	const link = iconLink(html);
	expect(link).not.toBeNull();
	expect(link[0]).toContain('type="image/svg+xml"');
	expect(link[0]).toMatch(/href="[^"]+\.svg"/);
});

it("entries without a per-entry html override inherit output.html", () => {
	const html = readHtml("d.html");
	const body = html.match(/<body>([\s\S]*?)<\/body>/i)[1];
	expect(body).toMatch(scriptRe);
});
