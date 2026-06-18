const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");

it("mirrors output.crossOriginLoading onto the injected script", () => {
	const html = read("main.html");
	expect(html).toMatch(
		/<script src="[^"]+\.js" crossorigin="anonymous"><\/script>/
	);
});

it("mirrors output.crossOriginLoading onto the extracted stylesheet link", () => {
	const html = read("main.html");
	expect(html).toMatch(
		/<link rel="stylesheet" href="[^"]+\.css" crossorigin="anonymous">/
	);
});
