const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const scriptTag = (html) => html.match(/<script[^>]*>/i)[0];

it("leaves tags untouched with no alterTags tap", () => {
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

it("leaves output byte-identical when a tap mutates nothing", () => {
	// same input + a no-op tap ⇒ only the entry filename differs between the two
	// configs, so compare with that normalized away
	const normalize = (name) =>
		readHtml(`${name}.html`).replace(new RegExp(`${name}\\.js`, "g"), "ENTRY");
	expect(normalize("noop")).toBe(normalize("default"));
});
