const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const iconLink = (html) => html.match(/<link rel="icon"[^>]*>/i);

it("injects the default webpack svg favicon", () => {
	const link = iconLink(readHtml("default.html"));
	expect(link).not.toBeNull();
	expect(link[0]).toContain('type="image/svg+xml"');
	expect(link[0]).toMatch(/href="[^"]+\.svg"/);
});

it("synthetic wrapper favicon href is content-hashed", () => {
	const link = iconLink(readHtml("default.html"));
	expect(link).not.toBeNull();
	// hashed asset names are hex strings — not the bare "favicon.svg"
	expect(link[0]).not.toContain('href="favicon.svg"');
	expect(link[0]).toMatch(/href="[0-9a-f]{16,}\.svg"/);
});

it("emits the favicon asset with non-empty SVG content", () => {
	const files = fs.readdirSync(__dirname);
	const svgs = files.filter((f) => f.endsWith(".svg"));
	expect(svgs.length).toBeGreaterThan(0);
	for (const svg of svgs) {
		const content = fs.readFileSync(path.resolve(__dirname, svg), "utf-8");
		expect(content.length).toBeGreaterThan(0);
		expect(content).toMatch(/<svg/i);
	}
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

it("favicon is the first tag inside <head> in authored HTML", () => {
	const html = readHtml("authored.html");
	const headContentMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
	const headContent = headContentMatch ? headContentMatch[1] : "";
	const firstTagMatch = headContent.trim().match(/^<[^>]+>/);
	const firstTag = firstTagMatch ? firstTagMatch[0] : "";
	expect(firstTag).toMatch(/rel="icon"/i);
});

it("does not inject favicon into authored HTML when favicon: false", () => {
	expect(iconLink(readHtml("authored-off.html"))).toBeNull();
});

it("emits the favicon asset for authored HTML entry", () => {
	const files = fs.readdirSync(__dirname);
	expect(files.some((f) => f === "favicon.svg")).toBe(true);
});

it("injects custom favicon into authored HTML entry", () => {
	const link = iconLink(readHtml("authored-custom.html"));
	expect(link).not.toBeNull();
	expect(link[0]).toMatch(/href="[^"]+\.svg"/);
	expect(link[0]).toContain('type="image/svg+xml"');
});

it("injects favicon into all pages of a multi-page authored HTML build", () => {
	const link1 = iconLink(readHtml("page.html"));
	const link2 = iconLink(readHtml("page-off.html"));
	expect(link1).not.toBeNull();
	expect(link2).not.toBeNull();
});

it("does not double-inject when authored HTML has <link rel='icon'> with single quotes", () => {
	const html = readHtml("has-icon-squote.html");
	const matches = html.match(/rel\s*=\s*["']?(?:shortcut\s+)?icon/gi) || [];
	expect(matches.length).toBe(1);
});

it("does not double-inject when authored HTML has <LINK REL=\"ICON\"> uppercase", () => {
	const html = readHtml("has-icon-upper.html");
	const matches = html.match(/rel\s*=\s*["']?(?:shortcut\s+)?icon/gi) || [];
	expect(matches.length).toBe(1);
});

it("does not double-inject when authored HTML has <link rel=\"shortcut icon\">", () => {
	const html = readHtml("has-shortcut-icon.html");
	const matches = html.match(/rel\s*=\s*["']?(?:shortcut\s+)?icon/gi) || [];
	expect(matches.length).toBe(1);
});
