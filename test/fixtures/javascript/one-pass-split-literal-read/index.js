// A string literal split by a constant string reads as the array it makes.
var count = "a,b,c".split(",").length;
var second = "a,b,c".split(",")[1];
// An index past it, one not known or a write stays.
function kept(index) {
	var parts = "a,b".split(",");
	parts[1] = "x";
	return ["a,b,c".split(",")[5], "a,b,c".split(",")[index], parts];
}
console.log(count, second, kept(0));
