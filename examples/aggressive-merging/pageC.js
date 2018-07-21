require(["./a"], function(a) {
	console.log(a + require("./b"));
});