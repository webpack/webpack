import { Teaser } from "./liba";

document.body.innerHTML = Teaser();

// https://github.com/webpack/webpack/issues/18961
// https://github.com/jantimon/reproduction-webpack-css-order
it("keep consistent css order", function() {
	const fs = __non_webpack_require__("fs");
	let source = fs.readFileSync(__dirname + "/main.css", "utf-8");
	expect(removeComments(source)).toMatchSnapshot()
});

function removeComments(source) {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n/g, "");
}