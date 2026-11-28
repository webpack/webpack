import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should skip a conditional @import of a stylesheet it is already inside", () => {
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css.match(/\.self \{/g)).toHaveLength(1);
	expect(css.match(/\.loop-a \{/g)).toHaveLength(1);
	expect(css.match(/\.loop-b \{/g)).toHaveLength(1);
	expect(css.match(/\.style \{/g)).toHaveLength(1);
	expect(css).toMatch(/@media screen \{\s*\.self \{/);
	expect(css).toMatch(
		/@media print \{\s*@media \(min-width: 1px\) \{\s*\.loop-b \{/
	);
});
