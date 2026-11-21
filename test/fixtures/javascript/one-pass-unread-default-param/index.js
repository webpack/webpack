// A parameter nothing reads defaulting to a literal leaves the constants
// passed to the others to print where they are read.
(function (word, unused = "FAIL") {
	console.log(word);
})("PASS");
(function (word, unused = 1, last) {
	console.log(word, last);
})("first", void 0, "last");
(function (word, unused = 2) {
	console.log(word);
})("ran", console.log("runs first"));
// One reading `arguments` keeps what it is passed.
(function (word, unused = 1) {
	console.log(word, arguments.length);
})("args", 2);
