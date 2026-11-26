// A string a name collapses into reads its `length`, where an operator around folds.
function plain() {
	var s = "abc";
	return s.length;
}
function added() {
	var s = "abc";
	return s.length + 1;
}
function tested() {
	var s = "abc";
	return s.length > 2 ? "y" : "n";
}
function after() {
	var s = "abc";
	seen.push(1);
	return s.length;
}
function passed(a) {
	var s = a;
	return s.length;
}
function number() {
	var s = 1;
	return s.length;
}
var seen = [];
console.log(plain(), added(), tested(), after(), passed(seen), number(), seen);
