// A built-in call whose receiver or argument a declarator collapses into folds.
var word = "test";
console.log(word.indexOf("e"));
var letter = "s";
console.log("test".indexOf(letter));
var text = "abc";
console.log(text.toUpperCase() + String(Math.random() < 2));
function inner() {
	var s = "hello";
	return [s.charAt(1)];
}
console.log(inner());
var list = [1, 2];
console.log(list.indexOf(2));
