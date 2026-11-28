// A string literal split by a constant string joins as the array it makes.
var replaced = "c_c_c".split("c").join("x");
var listed = "a b c".split(" ").join();
var spaced = "abc".split("").join("-");
// A pattern, a limit not known or a receiver not known stays.
function kept(value) {
	return ["abc".split(/b/).join("-"), "abc".split("b", value.length).join("-"), value.split("_").join("")];
}
console.log(replaced, listed, spaced, kept("x_y"));
