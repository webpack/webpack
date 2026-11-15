it("should re-export JSON keys with line breaks from a concatenated module", () =>
	import("./reexport").then(({ used, other }) => {
		expect(used).toBe(1);
		expect(other).toBe("other");
		expect(typeof x).toBe("undefined");
	}));

it("should keep export names with line breaks inside one comment line", () => {
	const fs = require("fs");
	const path = require("path");
	const source = fs
		.readdirSync(__dirname)
		.filter((file) => file.endsWith(".js"))
		.map((file) => fs.readFileSync(path.join(__dirname, file), "utf-8"))
		.join("\n");
	const comments = source.match(/\/\/ UNUSED EXPORTS: .*/g);
	expect(comments).toHaveLength(1);
	expect(comments[0]).toContain("a\\nx = 1");
	expect(comments[0]).toContain("b\\rx = 1");
	expect(comments[0]).toContain("c\\u2028x = 1");
	expect(comments[0]).toContain("d\\u2029x = 1");
	expect(source).not.toMatch(/^x = 1/m);
});
