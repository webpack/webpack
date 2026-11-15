const fs = require("fs");
const path = require("path");

it("should load a chunk whose name contains line breaks", () =>
	import(/* webpackChunkName: "a\nb\rc\u2028d\u2029e" */ "./chunk").then(
		(ns) => {
			expect(ns.default).toBe("chunk");
			const source = fs.readFileSync(
				path.join(__dirname, "a\nb\rc\u2028d\u2029e.js"),
				"utf-8"
			);
			expect(source).toMatch(
				/\n\/\/# sourceMappingURL=a%0Ab%0Dc%E2%80%A8d%E2%80%A9e\.js\.map$/
			);
		}
	));

it("should keep a line comment for a JavaScript asset whose query ends in .css", () => {
	const file = path.join(__dirname, "other.js");
	expect(() => __non_webpack_require__(file)).not.toThrow();
	const source = fs.readFileSync(file, "utf-8");
	expect(source).toMatch(
		/\n\/\/# sourceMappingURL=[^\n]*other\.js\.map\?a%2A\/b\.css$/
	);
});
