import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should put the modules a stylesheet composes from in its layer", () => {
	const css = fs
		.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8")
		.replace(/\/\*[^]*?\*\//g, "");
	expect(css).toMatch(/@layer base \{\s*\.[\w-]+ \{ color: blue; \}\s*\}/);
	expect(css).toMatch(/@layer base \{\s*\.[\w-]+ \{ color: green; \}\s*\}/);
	expect(css).toMatch(/@layer base \{\s*\.[\w-]+ \{\s*color: red;\s*\}\s*\}/);
	expect(css).not.toMatch(/^\.[\w-]+ \{ color: (?:blue|green); \}/m);
});
