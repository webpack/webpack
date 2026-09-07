const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should copy the file", () => {
	expect(read("late/note.txt")).toBe("late\n");
});

it("should copy at the stage the option names", () => {
	const seen = JSON.parse(read("seen-at-summarize.json"));

	// the copy runs after 'summarize', so nothing had it yet
	expect(seen).not.toContain("late/note.txt");
	expect(__STATS__.assets.map((asset) => asset.name)).toContain(
		"late/note.txt"
	);
});
