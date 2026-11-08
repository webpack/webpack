(function () {
	console.log(1);
})();
(function (b) {
	var c = b;
	console.log(c);
})(2);
(function () {
	if (console) console.log(3);
})();
(function () {
	console.log(4);
	console.log(5);
})();
console.log(6);
