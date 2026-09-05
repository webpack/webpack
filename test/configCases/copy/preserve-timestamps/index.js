const fs = require("fs");
const path = require("path");
const MTIME = require("./mtime");

const stat = (name) => fs.statSync(path.resolve(__dirname, name));

it("should keep the modification time of the file it copied", () => {
	expect(Math.floor(stat("kept/note.txt").mtimeMs / 1000)).toBe(MTIME / 1000);
});

it("should stamp a copied file with the write time by default", () => {
	expect(stat("stamped/note.txt").mtimeMs).toBeGreaterThan(MTIME);
});
