(function (value) {
	console.log(eval("value"));
	return arguments.length;
})(1, 2);
(function (value) {
	console.log(String("value"));
	return arguments.length;
})(1, 2);
console.log("eval");
