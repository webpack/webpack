function first() {
	return 1;
}
function effect() {
	throw new Error("effect");
}
function get() {
	console.log("get");
	return { x: 1, y: 2 };
}
function run() {
	var a = first(),
		unused = effect(),
		live = (function (p) {
			return p.x + p.y;
		})(get());
	return [a, a, live, live];
}
try {
	console.log(run());
} catch (e) {
	console.log(e.message);
}
