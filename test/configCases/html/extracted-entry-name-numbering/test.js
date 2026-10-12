const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should number scripts sharing a basename past every name already taken", () => {
	const html = read("index.html");
	const pattern = /<script src="([^"]+)">/g;
	const srcs = [];
	let match;
	while ((match = pattern.exec(html)) !== null) srcs.push(match[1]);
	expect(srcs).toEqual(["app.js", "app2.js", "app3.js"]);
	expect(read("app.js")).toContain("a-script");
	expect(read("app2.js")).toContain("b-script");
	expect(read("app3.js")).toContain("c-script");
	expect(read("app1.js")).toContain("other-entry");
});
