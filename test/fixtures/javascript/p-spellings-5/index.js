var o = {
	toString() {
		console.log("converted");
		return "o";
	}
};
function f(b) {
	"a" + b;
	"a" + "b" + b + o;
	o + "c";
	"d" + o.toString();
}
f(o);
