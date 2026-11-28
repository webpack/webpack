// A constant integer limit counts the parts a split literal makes.
var first = "abc".split("b", 1).join("-");
var count = "a,b,c".split(",", 2).length;
var none = "a,b,c".split(",", 0).join();
// A negative, fractional or unknown limit stays.
function kept(limit) {
	return ["a,b,c".split(",", -1).join(), "a,b,c".split(",", 1.5).join(), "a,b,c".split(",", limit).join()];
}
console.log(first, count, none, kept(1));
