const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should end an import cycle inside a conditional copy", () => {
	const x = fs.readFileSync(path.join(__dirname, "x.css"), "utf-8");
	expect(x.match(/\.a \{/g)).toHaveLength(1);
	expect(x.match(/\.b \{/g)).toHaveLength(1);
	expect(x).toMatch(/@media screen \{\s*\.a \{/);
	expect(x).not.toMatch(/@media print/);
	const a = fs.readFileSync(path.join(__dirname, "a.css"), "utf-8");
	expect(a.match(/\.a \{/g)).toHaveLength(1);
	expect(a.match(/\.b \{/g)).toHaveLength(1);
	expect(a).not.toMatch(/@media/);
});
