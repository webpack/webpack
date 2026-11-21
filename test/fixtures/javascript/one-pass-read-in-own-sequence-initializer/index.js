var seen = [];
function emit(value) {
	seen.push(value);
}
function short() {
	var x = (emit(x), 42);
	return x;
}
function long() {
	var value = (emit(value), emit(typeof value), "s" + "t");
	emit(value);
	return value + value;
}
function nested() {
	var value = (emit(function () {
		return value;
	}), 42);
	return value + seen[seen.length - 1]();
}
function lexical() {
	try {
		const value = (emit(value), 42);
		return value;
	} catch (error) {
		return error.name;
	}
}
console.log(short(), long(), nested(), lexical(), seen.length, seen[0], seen[1], seen[2], seen[3]);
