const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const scriptTag = (html) => html.match(/<script[^>]*>/i)[0];

it("leaves tags untouched with no transformTags tap", () => {
	const html = readHtml("default.html");
	expect(html).toContain('<meta name="theme" content="a">');
	expect(scriptTag(html)).not.toContain("nonce");
});

it("adds an attribute (nonce) to matching tags", () => {
	expect(scriptTag(readHtml("nonce.html"))).toContain('nonce="__N__"');
});

it("removes a tag via remove: true", () => {
	const html = readHtml("remove.html");
	expect(html).not.toContain('name="theme"');
	// other tags stay
	expect(html).toContain("<script");
});

it("drops an existing attribute and adds another", () => {
	const tag = scriptTag(readHtml("attr.html"));
	expect(tag).not.toContain("defer");
	expect(tag).toContain('crossorigin="anonymous"');
	// the untouched src attribute survives
	expect(tag).toContain("src=");
});

it("moves a tag between <head> and <body> via injectTo", () => {
	const html = readHtml("move.html");
	const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
	const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>"));
	// the <script> moved from <body> into <head>, keeping src + gaining crossorigin
	expect(head).toContain("<script");
	expect(head).toContain("src=");
	expect(head).toContain('crossorigin="anonymous"');
	expect(body).not.toContain("<script");
	// the theme <meta> moved to the very start of <body>
	expect(head).not.toContain('name="theme"');
	expect(body).toMatch(/^<body><meta name="theme"/);
});

it("moves tags to the head start and the body end", () => {
	const html = readHtml("move2.html");
	const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
	const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>"));
	// <script> prepended into <head> (right after the open tag)
	expect(head).toMatch(/^<head><script/);
	expect(body).not.toContain("<script");
	// theme <meta> appended at the very end of <body>
	expect(body).toMatch(/<meta name="theme"[^>]*>$/);
	expect(head).not.toContain('name="theme"');
});

it("leaves output byte-identical when a tap mutates nothing", () => {
	// same input + a no-op tap ⇒ only the entry filename differs between the two
	// configs, so compare with that normalized away
	const normalize = (name) =>
		readHtml(`${name}.html`).replace(new RegExp(`${name}\\.js`, "g"), "ENTRY");
	expect(normalize("noop")).toBe(normalize("default"));
});
