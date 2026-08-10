import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should compile with warning", done => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" red");
	done();
});

it("should emit the namespace URIs unchanged", () => {
	expect(
		fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8")
	).toMatchSnapshot();
});

it("should not emit an asset for a namespace URI", () => {
	// A namespace URI is an opaque identifier, not a request for a file.
	expect(fs.readdirSync(__dirname).filter(f => f.endsWith(".svg"))).toEqual([]);
});
