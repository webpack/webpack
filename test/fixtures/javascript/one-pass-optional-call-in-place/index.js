function foo() {
	console.log("foo");
	return 1;
}
function bar() {
	console.log("bar");
	return 2;
}
var obj = {
	prop: (() => (foo(), bar()))?.(),
	none: (() => null)?.(),
	pair: (() => (1, 2))?.()
};
console.log(obj.prop, obj.none, obj.pair);
var x;
x = (function () {
	return "value";
})?.();
console.log(x, [(() => "element")?.()][0]);
