(function (bar) {
	for (; bar(); ) break;
})(function qux() {
	return console.log("for", typeof qux), qux;
});
(function (bar) {
	while (bar()) break;
})(function qux() {
	return console.log("while", typeof qux), qux;
});
(function (bar) {
	for (bar(); ; ) break;
})(function qux() {
	return console.log("init", typeof qux), qux;
});
(function (bar) {
	for (var i = 0; i < 2; i++) bar();
})(function qux() {
	return console.log("looped", typeof qux), qux;
});
(function (bar) {
	for (; ; bar()) break;
})(function qux() {
	return console.log("never"), qux;
});
