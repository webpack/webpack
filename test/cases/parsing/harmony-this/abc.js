function returnThis() {
	if(typeof this === "undefined") return "undefined";
	return this;
}

var a = returnThis;
var b = returnThis;

export {
	a,
	b
}

export default returnThis;
