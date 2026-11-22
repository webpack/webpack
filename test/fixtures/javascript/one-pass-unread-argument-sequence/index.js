var e = [];
function t(a) {}
function run() {
	t((e.push("a"), 1));
	t((e.push("b"), 1), (e.push("c"), 2));
	[(e.push("d"), 1), (e.push("f"), 2)];
	({ k: (e.push("g"), 1) });
}
run();
var o = {
	get x() {
		e.push("get");
		return 1;
	}
};
t((e.push("h"), o.x));
console.log(e.join());
