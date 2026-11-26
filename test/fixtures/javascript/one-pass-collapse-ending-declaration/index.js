// A declaration ending its list folds a declarator into the next one's value.
var seen = [];
function load(name) {
	seen.push(name);
	return { default: name, y: name + "!" };
}
setTimeout(function () {
	console.log(e, k, l, seen);
});
{
	var w = load("w"),
		z = w.y;
	seen.push(z);
}
var k = load("k"),
	l = k.y;
var mod = load("x");
var value;
value = mod.default;
var e = value;
