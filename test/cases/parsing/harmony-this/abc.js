function returnThis() {
	if (typeof this === "undefined") return expect("undefined");
	return expect(this);
}

var a = returnThis;
var b = returnThis;

export { a, b };

export default returnThis;
