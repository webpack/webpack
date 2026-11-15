function test() {
	for (var i = 0; i < 2; i++) {}
	console.log("test", i);
}
var run = function (i) {
	test();
	console.log(i);
};
run(5);
run(6);
