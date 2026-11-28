function charAt() {
	const s = "abc";
	return s[1];
}
function charAtKey() {
	const s = "abc";
	return s["1"];
}
function pastString() {
	const s = "abc";
	return s[5];
}
function compareChar() {
	const s = "abc";
	return s[1] === "b";
}
function typeofChar() {
	const s = "abc";
	return typeof s[1];
}
function typeofPastString() {
	const s = "abc";
	return typeof s[5];
}
function pastArray() {
	const a = [1, 2];
	return a[5];
}
function arrayHole() {
	const a = [1, , 3];
	return a[1];
}
function sideEffectArray() {
	const a = [console.log("side"), 2];
	return a[5];
}
function deletePastString() {
	const s = "abc";
	return delete s[5];
}
console.log(
	charAt(),
	charAtKey(),
	pastString(),
	compareChar(),
	typeofChar(),
	typeofPastString(),
	pastArray(),
	arrayHole(),
	sideEffectArray(),
	deletePastString()
);
