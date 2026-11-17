"use strict";

const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const exists = (name) => fs.existsSync(path.resolve(__dirname, name));

it("should glob a 'from' that also names an entry matching it", () => {
	expect(read("img/cat.png")).toBe("cat");
	expect(exists("img/page.html")).toBe(false);
	expect(exists("img/*.png/page.html")).toBe(false);
});

it("should copy a 'from' naming an entry its glob does not match", () => {
	expect(read("id/index.html")).toBe("id");
});

it("should glob a 'from' naming a link that matches it", () => {
	expect(read("links/dog.png")).toBe("dog");
	expect(fs.lstatSync(path.resolve(__dirname, "links/*.png")).isSymbolicLink()).toBe(
		true
	);
});
