var DEBUG = 1;
var label = "PASS";
var empty = "";
DEBUG &&
	(function () {
		console.log("debug", typeof this);
	})();
"on" &&
	(function (first, second) {
		console.log(first, second);
	})(1, 2);
0 ||
	(function (value) {
		console.log("or", value);
	})(label);
empty ||
	(function () {
		console.log("empty");
		console.log("twice");
	})();
label && console.log(label);
