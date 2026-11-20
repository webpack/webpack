var proto = {}.constructor.prototype;
proto.__defineSetter__("x", function (v) {
	console.log("setter", v);
});
function make() {
	const o = {};
	o.x = 1;
	return o;
}
var r = make();
console.log(Object.keys(r).length);
delete proto.x;
