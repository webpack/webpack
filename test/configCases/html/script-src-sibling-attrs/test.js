const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should copy quoted, bare and unquoted CSP/fetch attributes byte-exact onto the synthesized sibling <link>", () => {
	const extracted = readFile("page.html");

	const linkMatch = extracted.match(/<link rel="stylesheet"[^>]*>/);
	expect(linkMatch).not.toBeNull();
	const linkTag = linkMatch[0];
	expect(linkTag).toMatch(/href="[^"]+\.css"/);

	// Each copyable attribute is carried back in its original source form —
	// quoted, bare (valueless), and unquoted — in the fixed nonce/crossorigin/
	// referrerpolicy order, regardless of source order.
	expect(linkTag).toContain(
		' nonce="tok-1" crossorigin referrerpolicy=origin'
	);
	// `defer` is not a copyable attribute, so it must not leak onto the link.
	expect(linkTag).not.toContain("defer");

	// The script is `defer`, so the link follows it (Vite order).
	const scriptIdx = extracted.indexOf("<script");
	const linkIdx = extracted.indexOf('<link rel="stylesheet"');
	expect(linkIdx).toBeGreaterThan(scriptIdx);
});
