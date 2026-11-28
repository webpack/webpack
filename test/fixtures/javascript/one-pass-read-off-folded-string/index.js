// A read off a member folding to a string reads that string.
var split = "a,b".split(",")[1].length;
var character = "abc"[0].length;
var nested = "abc"[1][0];
var picked = [["ab"]][0][0].length;
// A member not known stays.
function kept(object) {
	return object.name.length;
}
console.log(split, character, nested, picked, kept({ name: "xyz" }));
