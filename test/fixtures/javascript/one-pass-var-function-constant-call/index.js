// A `var` set at its function's top to a function returning a literal folds its calls.
function arrow() {
	var h = () => 0;
	return h() + h();
}
function expression() {
	var h = function () {
		return "x";
	};
	return h() + h();
}
function branch(c) {
	if (c) {
		var h = () => 0;
	}
	try {
		return h();
	} catch (e) {
		return e.name;
	}
}
function before() {
	try {
		return h();
	} catch (e) {
		return e.name;
	} finally {
		var h = () => 0;
	}
}
function reset() {
	var h = () => 0;
	h = () => 1;
	return h();
}
console.log(arrow(), expression(), branch(1), branch(0), before(), reset());
