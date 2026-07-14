it("should lower async modules to generators and keep correct values", () =>
	import("./middle.js").then(({ combined }) => {
		expect(combined).toBe(23);
	}));

it("should drive bodies with the generator helper (no async wrapper)", () => {
	const fs = require("fs");
	const path = require("path");
	const dir = path.dirname(__filename);
	const source = fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".js"))
		.map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
		.join("\n");
	expect(source).toContain("__webpack_require__.aG(");
	expect(source).toContain(["fun", "ction*"].join(""));
	expect(source).toContain(["yi", "eld "].join(""));
});
