// `x=x` printing as its read takes the value a declarator before sets.
function divide(count) {
	var share = 3 / count;
	return (share = share);
}
function declared(value) {
	var tripled = value * 3;
	var copy = (tripled = tripled);
	return copy;
}
// One read again, or set to something else, keeps the name.
function again(value) {
	var kept = value + 1;
	return (kept = kept) + kept;
}
function compound(value) {
	var sum = value + 1;
	return (sum += sum);
}
function other(value, next) {
	var kept = value + 1;
	return [(kept = next), kept];
}
console.log(divide(2), declared(2), again(1), compound(1), other(1, 5));
