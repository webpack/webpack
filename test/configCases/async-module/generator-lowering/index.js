it("should lower async modules to generators and keep correct values", () =>
	import("./middle.js").then(({ combined }) => {
		expect(combined).toBe(23);
	}));

it("should keep the parentheses around an awaited operand balanced", () =>
	import("./parenthesized.js").then(({ picked, scaled, broken }) => {
		expect(picked).toBe(4);
		expect(scaled).toBe(6);
		expect(broken).toBe(7);
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
