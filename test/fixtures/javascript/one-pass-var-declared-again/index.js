var first, first;
console.log(typeof first);

var set = 1,
	set;
console.log(set);

function local() {
	var a,
		b = 2,
		a;
	return [a, b].join();
}
console.log(local());

function caught() {
	try {
		throw 1;
	} catch (error) {
		var error, error;
		return error;
	}
}
console.log(caught());

function parameter(value) {
	var value, value;
	return value;
}
console.log(parameter(3));
