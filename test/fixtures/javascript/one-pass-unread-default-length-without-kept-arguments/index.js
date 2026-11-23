(function f(a, notCounted = true, ...alsoNotCounted) {
	console.log(f.name.length, f.length);
})();

function g(a, b = 2, c) {
	console.log(g.length, a);
}
g(1);
