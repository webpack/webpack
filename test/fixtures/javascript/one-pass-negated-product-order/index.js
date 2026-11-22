var sink = {
	log: function (value) {
		console.log(value);
	}
};
function run(right) {
	const left = {
		valueOf() {
			right = 5;
			return 2;
		}
	};
	sink.log(-(left * right));
	sink.log(-(left % right));
}
run(3);
function plain(a, b) {
	sink.log(-(a * 4));
	sink.log(-(2 * b));
	sink.log(-((a | 0) * b));
	sink.log(-(a / b));
}
plain(6, 4);
plain({ valueOf: function () { return 3; } }, 2);
