// \u{110000} names no code point, so the counter reads it as written
function outer(argument) {
	var value = argument + 1;
	return value;
}
console.log(outer(1));
