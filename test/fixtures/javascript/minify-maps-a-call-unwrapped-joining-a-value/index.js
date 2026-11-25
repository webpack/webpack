function run() {
	var a = first(),
		unused = (function (y) {
			var x = effect(y);
			log(x);
			log(x);
		})(arg),
		live = get();
	return [a, a, live, live];
}
