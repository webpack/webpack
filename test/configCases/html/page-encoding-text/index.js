const crypto = __non_webpack_require__("crypto");
const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");
const { TextDecoder } = __non_webpack_require__("util");

const page = () =>
	new TextDecoder("windows-1252").decode(
		fs.readFileSync(path.join(__dirname, "page.html"))
	);

it("should resolve a url with a character of the page's encoding", () => {
	expect(page()).toMatch(/<img src="[^"]+\.svg" alt="€">/);
});

it("should keep the characters of an inline stylesheet", () => {
	expect(page()).toMatch(/content: "€"/);
});

it("should hand an inline script its characters", () => {
	const src = /<script src="([^"]+)"/.exec(page())[1];
	const code = fs.readFileSync(path.join(__dirname, src), "utf8");
	expect(code).toContain('"12 €"');
});

it("should hash an inline stylesheet's characters for the policy", () => {
	const html = page();
	const body = /<style>([^]*?)<\/style>/.exec(html)[1];
	const hash = crypto.createHash("sha256").update(body, "utf8").digest("base64");
	expect(html).toContain(`'sha256-${hash}'`);
});
