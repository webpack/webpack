import { c, b, a } from "dep";

c()
b()
a()

it("keep consistent css order", function() {
	const fs = __non_webpack_require__("fs");
	let source = fs.readFileSync(__dirname + "/main.css", "utf-8");
	expect(removeComments(source)).toMatchSnapshot()
});

function removeComments(source) {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n/g, "");
}
