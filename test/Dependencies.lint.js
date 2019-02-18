const fs = require("fs");
const path = require("path");
const lockfile = require("@yarnpkg/lockfile");

const file = fs.readFileSync(path.resolve(__dirname, "../yarn.lock"), "utf-8");
const result = lockfile.parse(file);

describe("Dependencies", () => {
	it("should parse fine", () => {
		expect(result.type).toBe("success");
	});

	if (result.type === "success") {
		const content = result.object;
		for (const dep of Object.keys(content)) {
			describe(dep, () => {
				const info = content[dep];
				it("should resolve to a npm package", () => {
					expect(info.resolved).toMatch(/^https:\/\/registry\.yarnpkg\.com\//);
				});
				it("should have a integrity hash", () => {
					expect(info.integrity).toMatch(/^(sha1|sha512)-/);
				});
			});
		}
	}
});
