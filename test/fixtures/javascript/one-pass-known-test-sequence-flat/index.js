var log = [];
function f(v) {
	log.push(v);
	return v;
}
var x = (f(1), 1) ? ((f(2), 1) ? f("a") : "b") : "c";
var y = (f(3), 1) ? (f(4), f("seq")) : "d";
console.log(x + y, x, y, `${(f(5), 1) ? ((f(6), 1) ? "t" : "u") : "v"}`);
var o = {
	toString: function () {
		log.push("toString");
		return "";
	}
};
function pick(p) {
	return "0" + p ? ("1" + p ? "y" : "z") : "n";
}
console.log(pick(o), "0" + o ? ("1" + o ? 1 : 2) : 3);
for (var i = (f(7), 1) ? ((f(8), 1) ? "k" in o : 0) : 0; i; i = 0) log.push(i);
console.log(log.join());
