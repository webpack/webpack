const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const iconLink = (html) => html.match(/<link rel="icon"[^>]*>/i);
const scriptRe = /<script[^>]* src="__html_[a-f0-9]+_0\.js"[^>]*>/;
const deferScriptRe = /<script defer src="__html_[a-f0-9]+_0\.js"><\/script>/;
const inHead = (html) => html.match(/<head>([\s\S]*?)<\/head>/i)[1];
const inBody = (html) => html.match(/<body>([\s\S]*?)<\/body>/i)[1];

it("entries without a per-entry html override inherit output.html", () => {
	const html = readHtml("d.html");
	expect(iconLink(html)).not.toBeNull();
	expect(html).toContain('<link rel="manifest"');
	expect(html).toContain("<title>Global title</title>");
	expect(html).toContain('<meta charset="utf-8">');
	expect(html).toContain('<meta name="description" content="global description">');
	expect(inBody(html)).toMatch(deferScriptRe);
});

it("per-entry html object with favicon:false keeps the other output.html options", () => {
	const html = readHtml("a.html");
	expect(iconLink(html)).toBeNull();
	expect(html).toContain('<link rel="manifest"');
	expect(html).toContain("<title>Global title</title>");
	expect(html).toContain('<meta charset="utf-8">');
});

it("per-entry html object with inject:'head' places scripts in <head>", () => {
	const html = readHtml("b.html");
	expect(inHead(html)).toMatch(scriptRe);
	expect(inBody(html)).not.toMatch(scriptRe);
	expect(iconLink(html)).not.toBeNull();
	expect(html).toContain("<title>Global title</title>");
});

it("per-entry html object with favicon path overrides the inherited favicon", () => {
	const html = readHtml("c.html");
	const link = iconLink(html);
	expect(link).not.toBeNull();
	expect(link[0]).toContain('type="image/svg+xml"');
	expect(link[0]).toMatch(/href="[^"]+\.svg"/);
	expect(link[0]).not.toBe(iconLink(readHtml("d.html"))[0]);
});

it("per-entry html:true inherits every output.html option", () => {
	const html = readHtml("e.html");
	expect(iconLink(html)[0]).toBe(iconLink(readHtml("d.html"))[0]);
	expect(html).toContain('<link rel="manifest"');
	expect(html).toContain("<title>Global title</title>");
	expect(inBody(html)).toMatch(deferScriptRe);
});

it("per-entry html object overrides title and scriptLoading", () => {
	const html = readHtml("f.html");
	expect(html).toContain("<title>Page f</title>");
	expect(html).not.toContain("Global title");
	expect(inBody(html)).toMatch(scriptRe);
	expect(html).not.toContain("defer");
	expect(iconLink(html)).not.toBeNull();
});
