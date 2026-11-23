// A function's own `arguments.length` reads its own data property.
function counted() {
	return arguments.length;
}
counted(1, 2);
(function () {
	var unused = arguments.length;
})(1);
console.log(
	(function () {
		return (function () {
			return arguments.length;
		})(1, 2, 3);
	})()
);
function redefined() {
	var before = arguments.length;
	Object.defineProperty(arguments, "length", {
		get: function () {
			console.log("getter");
			return 9;
		}
	});
	return arguments.length;
}
console.log(redefined(1));
function deleted() {
	var before = arguments.length;
	delete arguments.length;
	return arguments.length;
}
console.log(deleted(1));
function assigned() {
	var before = arguments.length;
	[arguments.length] = [5];
	return arguments.length;
}
console.log(assigned(1));
function evaluated() {
	var before = arguments.length;
	return eval("arguments.length");
}
console.log(evaluated(1, 2));
function arrow() {
	var read = function () {
		return arguments.length;
	};
	var outer = (() => arguments.length)();
	return outer + read(1);
}
console.log(arrow(1, 2));
