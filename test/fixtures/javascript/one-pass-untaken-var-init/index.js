function use(value) {
	console.log(value);
}
if (0) {
	var k = 1;
} else use(k);
function inside() {
	if (!1) var a = 1, b = 2;
	if (void 0) var c = 3;
	if (1) use(d);
	else {
		var d = use(4);
	}
	return [a, b, c, d];
}
console.log(inside());
function written() {
	function read() {
		return w;
	}
	use(read());
	if (0) {
		var w = 1;
	} else w = 2;
	use(w);
}
written();
