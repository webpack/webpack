const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should keep the condition of an import that is a cycle only on another path", () => {
	const css = fs.readFileSync(path.join(__dirname, "c.css"), "utf-8");
	expect(css.match(/\.a \{/g)).toHaveLength(1);
	expect(css).toMatch(/@media screen \{\s*\.a \{/);
});
