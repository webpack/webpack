function run(list) {
	console.log(list.length);
	function each(f) {
		for (var i = 0; i < list.length; i++) f(list[i]);
	}
	each(console.log);
}
run([1, 2]);
(function () {
	console.log(3);
}).call(this);
console.log(4);
