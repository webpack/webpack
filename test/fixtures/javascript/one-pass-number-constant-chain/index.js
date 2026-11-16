function chain() {
	const a = 131755649;
	const b = 213185123 + a;
	const c = 7 + b + a;
	const d = 6 + c + b;
	return d + c;
}
function shortChain() {
	let a = 1, b = 2, c = 7 + b + a;
	return c * c;
}
function readOutside() {
	const a = 123456789;
	const b = a + 1;
	return [b, a, a, a];
}
function strings() {
	const a = "a long string literal";
	const b = a + "!";
	const c = b + "?";
	return c + b;
}
function written() {
	let a = 123456789;
	const b = a + 1;
	a++;
	return [a, b, b];
}
console.log(chain(), shortChain(), readOutside(), strings(), written());
