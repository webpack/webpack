import "./style.css";

const fs = require("fs");
const path = require("path");

// Built from parts so this bundle never holds the loader's output text.
const LOADER_OUTPUT = ["changed", "by", "loader"].join(" ");

it("should run inline loaders named in a CSS url()", () => {
	const css = fs.readFileSync(path.resolve(__dirname, "bundle0.css"), "utf-8");
	const urls = [];
	const urlRegExp = /url\(([^)]+\.svg)\)/g;
	for (let match; (match = urlRegExp.exec(css)) !== null; ) {
		urls.push(match[1]);
	}
	expect(urls).toHaveLength(2);
	const [loaded, plain] = urls.map((file) =>
		fs.readFileSync(path.resolve(__dirname, file), "utf-8")
	);
	expect(loaded).toContain(LOADER_OUTPUT);
	expect(plain).not.toContain(LOADER_OUTPUT);
});
