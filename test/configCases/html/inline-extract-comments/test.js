const fs = require("fs");
const path = require("path");

/**
 * @param {string} dir directory to list
 * @returns {string[]} every file below it, relative to `__dirname`
 */
const listFiles = (dir) => {
	/** @type {string[]} */
	const files = [];
	for (const name of fs.readdirSync(path.resolve(__dirname, dir))) {
		const file = dir ? `${dir}/${name}` : name;
		if (fs.statSync(path.resolve(__dirname, file)).isDirectory()) {
			files.push(...listFiles(file));
		} else {
			files.push(file);
		}
	}
	return files;
};

for (const page of ["page.html", "sub/page.html"]) {
	it(`should point ${page} at the license files of what it inlines`, () => {
		const html = fs
			.readFileSync(path.resolve(__dirname, page))
			.toString("utf-8");
		expect(html).toContain("inlined-body");
		expect(html).toMatch(/__licenseName\s*=\s*"main\.js\.LICENSE\.txt"/);
		expect(html).toMatch(/<style>[^<]*--spacing:\s*1em/);
		expect(html).not.toContain("css license");
		expect(html).not.toContain("js license");
		const pattern = /For license information please see ([^\s*]+)/g;
		/** @type {string[]} */
		const licenses = [];
		let match;
		while ((match = pattern.exec(html)) !== null) {
			licenses.push(
				path.posix.join(path.posix.dirname(page), match[1])
			);
		}
		expect(licenses).toHaveLength(2);
		for (const license of licenses) {
			expect(fs.existsSync(path.resolve(__dirname, license))).toBe(true);
		}
		expect(
			licenses
				.map((license) => fs.readFileSync(path.resolve(__dirname, license), "utf-8"))
				.join("")
		).toMatch(/css license[\s\S]*js license|js license[\s\S]*css license/);
	});
}

it("should delete the chunk files it inlined", () => {
	const chunkFiles = listFiles("").filter(
		(file) => /\.(?:css|js)$/.test(file) && file !== "test.js"
	);
	expect(chunkFiles).toEqual([]);
});
