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

const DEFAULT_BANNER = /For license information please see (.+?) \*\//g;

for (const [page, banner] of [
	["page.html", DEFAULT_BANNER],
	["sub/page.html", DEFAULT_BANNER],
	["my pages/page.html", DEFAULT_BANNER],
	["custom/page.html", /Licenses are in (.+?) \(copy: (.+?)\) \*\//g],
	["legacy/page.html", DEFAULT_BANNER]
]) {
	it(`should point ${page} at the license files of what it inlines`, () => {
		const html = fs
			.readFileSync(path.resolve(__dirname, page))
			.toString("utf-8");
		expect(html).toContain("inlined-body");
		expect(html).toMatch(/__licenseName\s*=\s*"main\.js\.LICENSE\.txt"/);
		expect(html).toMatch(/<style>[^<]*--spacing:\s*1em/);
		expect(html).not.toContain("css license");
		expect(html).not.toContain("js license");
		/** @type {string[]} */
		const licenses = [];
		let banners = 0;
		let match;
		while ((match = banner.exec(html)) !== null) {
			banners++;
			licenses.push(
				path.posix.join(path.posix.dirname(page), match[1])
			);
			// Every mention of the license file in a banner is rebased.
			for (const mention of match.slice(2)) {
				expect(
					fs.existsSync(
						path.resolve(__dirname, path.posix.dirname(page), mention)
					)
				).toBe(true);
			}
		}
		expect(banners).toBe(2);
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

it("should leave a banner naming no license file as written", () => {
	const html = fs
		.readFileSync(path.resolve(__dirname, "no-link/page.html"))
		.toString("utf-8");
	expect(html).toContain("inlined-body");
	expect(html.split("/*! See the licenses */")).toHaveLength(3);
});

it("should delete the chunk files it inlined", () => {
	const chunkFiles = listFiles("").filter(
		(file) => /\.(?:css|js)$/.test(file) && file !== "test.js"
	);
	expect(chunkFiles).toEqual([]);
});
