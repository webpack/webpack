import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

it("should keep placeholder-like text in a comment", () => {
	const withoutComments = css().replace(/\/\*[\s\S]*?\*\//g, "");
	expect(withoutComments).not.toContain(".hidden");
	expect(withoutComments).toContain(".a {");
});

it("should keep placeholder-like text in a string", () => {
	expect(css()).toMatch(/content: "[^"]*_WEBPACK_CSS_PUBLIC_PATH_AUTO__"/);
	expect(css()).toMatch(/content: "[^"]*_WEBPACK_CSS_PUBLIC_PATH_FULL_HASH_8__"/);
});
