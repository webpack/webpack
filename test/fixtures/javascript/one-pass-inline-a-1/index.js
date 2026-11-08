function test() {
	for (var i = 0; i < 2; i++) {}
	console.log("test", i);
}
var run = [
	function () {
		return test();
	}
];
run[0]();
