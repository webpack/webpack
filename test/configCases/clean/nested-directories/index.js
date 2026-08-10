const fs = require("fs");
const path = require("path");

it("should keep every directory on the way to an asset and drop the rest", () => {
	const here = path.dirname(__filename);
	for (const kept of [
		"js/main.txt",
		"static/js/main.txt",
		"static/deep/nested/leaf.txt"
	]) {
		expect(fs.existsSync(path.resolve(here, kept))).toBe(true);
	}
	for (const removed of [
		"js/stale.txt",
		"js/stale",
		"static/stale.txt",
		"unrelated"
	]) {
		expect(fs.existsSync(path.resolve(here, removed))).toBe(false);
	}
});
