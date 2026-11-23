var o = {};
function g() {
	console.log("g");
}
(function () {
	return o;
})().x = 10;
(function () {
	g();
	return o;
})().y = 20;
(function () {
	return {};
})().z = 30;
(function () {
	return function () {};
})().w = 40;
(function () {
	return o;
})().x += 1;
console.log(o.x, o.y);
