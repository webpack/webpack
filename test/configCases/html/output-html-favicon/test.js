const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const iconLink = (html) => html.match(/<link rel="icon"[^>]*>/);

it("injects the default webpack svg favicon", () => {
	const link = iconLink(readHtml("default.html"));
	expect(link).not.toBeNull();
	expect(link[0]).toContain('type="image/svg+xml"');
	expect(link[0]).toMatch(/href="[^"]+\.svg"/);
});

it("emits the favicon asset", () => {
	const files = fs.readdirSync(__dirname);
	expect(files.some((f) => f.endsWith(".svg"))).toBe(true);
});

it("omits the favicon when set to false", () => {
	expect(iconLink(readHtml("off.html"))).toBeNull();
});

it("uses a user-provided favicon", () => {
	const link = iconLink(readHtml("custom.html"));
	expect(link).not.toBeNull();
	expect(link[0]).toMatch(/href="[^"]+\.svg"/);
});

it("injects favicon into authored HTML entry", () => {
	const html = readHtml("authored.html");
	const link = iconLink(html);
	expect(link).not.toBeNull();
	expect(link[0]).toContain('type="image/svg+xml"');
	expect(link[0]).toMatch(/href="[^"]+\.svg"/);
});

it("does not inject favicon into authored HTML when favicon: false", () => {
	expect(iconLink(readHtml("authored-off.html"))).toBeNull();
});

it("emits the favicon asset for authored HTML entry", () => {
	const files = fs.readdirSync(__dirname);
	expect(files.some((f) => f === "favicon.svg")).toBe(true);
});
