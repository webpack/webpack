const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should keep the condition of an import only on the path where it is no cycle", () => {
	const c = fs.readFileSync(path.join(__dirname, "c.css"), "utf-8");
	expect(c.match(/\.a \{/g)).toHaveLength(1);
	expect(c).toMatch(/@media screen \{\s*\.a \{/);
	const a = fs.readFileSync(path.join(__dirname, "a.css"), "utf-8");
	expect(a.match(/\.a \{/g)).toHaveLength(1);
	expect(a.match(/\.b \{/g)).toHaveLength(1);
	expect(a).not.toMatch(/@media screen/);
});
