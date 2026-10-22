const fs = require("fs");
const path = require("path");

const a = require("./a");
const pkg = require("pkg");

it("should name modules in pathinfo comments relative to the context", () =>
	import(/* webpackChunkName: "async" */ "./async").then(({ default: b }) => {
		expect(a).toBe("a");
		expect(pkg).toBe("pkg");
		expect(b).toBe("b");

		const main = fs.readFileSync(__filename, "utf-8");
		const chunk = fs.readFileSync(path.join(__dirname, "async.js"), "utf-8");

		expect(main).toMatch(/__webpack_require__\(\/\*! \.\/a \*\/ /);
		expect(main).toContain("!*** ./node_modules/pkg/index.js ***!");
		expect(chunk).toContain("!*** ./async.js ***!");
		expect(chunk).toContain("!*** ./b.js ***!");
		// the absolute context names the suite's directory, which the bundle,
		// and so this comment, must not: the literal is split for that reason
		for (const source of [main, chunk]) {
			expect(source).not.toContain("config" + "Cases");
		}
	}));
