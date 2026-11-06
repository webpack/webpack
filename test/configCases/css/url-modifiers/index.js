import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

it("should keep the URL a string when url() carries modifiers", () => {
	expect(css()).toMatch(/\.a \{\n\tbackground: url\("[0-9a-f]+\.png" crossorigin\(anonymous\)\);/);
});

it("should keep the URL a string when url() carries a comment", () => {
	expect(css()).toMatch(/\.b \{\n\tbackground: url\("[0-9a-f]+\.png" \/\* note \*\/\);/);
});

it("should still unquote a plain url()", () => {
	expect(css()).toMatch(/\.c \{\n\tbackground: url\([0-9a-f]+\.png\);/);
});
