function emit(value) {
	console.log("emit", value);
	return value;
}
function nested() {
	let value = 1;
	{
		let value2 = (emit(value), 42);
		return value2 + value;
	}
}
function negated() {
	const value = (emit(2), 42);
	return -value;
}
function compared() {
	let value = (emit(3), "a");
	return typeof value;
}
function tested() {
	let value = (emit(4), 0);
	if (value) return 1;
	return 2;
}
function finished() {
	try {
		let value = (emit(5), emit(6), 3);
		return value << 1;
	} finally {
		emit(7);
	}
}
console.log(nested(), negated(), compared(), tested(), finished());
