const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const manifestLink = (html) => html.match(/<link rel="manifest"[^>]*>/i);

const hrefOf = (link) => link[0].match(/href="([^"]+)"/)[1];

const readFile = (href) =>
	fs.readFileSync(path.resolve(__dirname, href), "utf-8");

it("injects no manifest by default", () => {
	expect(manifestLink(readHtml("default.html"))).toBeNull();
});

it("generates a hashed .webmanifest from an object and links it", () => {
	const link = manifestLink(readHtml("object.html"));
	expect(link).not.toBeNull();
	const href = hrefOf(link);
	// content-hashed manifest filename, not a raw data: URL
	expect(href).toMatch(/^[0-9a-f]{16,}\.webmanifest$/);
	const manifest = JSON.parse(readFile(href));
	expect(manifest.name).toBe("My App");
	expect(manifest.theme_color).toBe("#317EFB");
	// the icon src was rewritten to a hashed asset that is actually emitted
	const iconSrc = manifest.icons[0].src;
	expect(iconSrc).toMatch(/^[0-9a-f]{16,}\.png$/);
	expect(fs.existsSync(path.resolve(__dirname, iconSrc))).toBe(true);
});

it("links an existing .webmanifest file and hashes its icons", () => {
	const link = manifestLink(readHtml("file.html"));
	expect(link).not.toBeNull();
	const href = hrefOf(link);
	expect(href).toMatch(/^[0-9a-f]{16,}\.webmanifest$/);
	const manifest = JSON.parse(readFile(href));
	expect(manifest.name).toBe("File App");
	expect(manifest.icons[0].src).toMatch(/^[0-9a-f]{16,}\.png$/);
	expect(fs.existsSync(path.resolve(__dirname, manifest.icons[0].src))).toBe(
		true
	);
});

it("supports a function that receives the page name", () => {
	const link = manifestLink(readHtml("fn.html"));
	expect(link).not.toBeNull();
	expect(JSON.parse(readFile(hrefOf(link))).name).toBe("Fn App");
});

it("does not inject a manifest into authored HTML (generated pages only)", () => {
	expect(manifestLink(readHtml("authored.html"))).toBeNull();
});
