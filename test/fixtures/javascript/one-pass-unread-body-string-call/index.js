var log = [];
function b() {
	log.push("b");
}
function c(x) {
	log.push("c" + x);
}
function g(a) {
	(function () {
		if (a) return;
		0, b();
	})();
}
function h(a) {
	(function () {
		if (a) return;
		0, c("(");
	})();
}
function k(a) {
	(function () {
		if (a) return;
		0, (log[0] = "k");
	})();
}
g(0);
g(1);
h(0);
h(1);
k(0);
k(1);
console.log(log.join());
