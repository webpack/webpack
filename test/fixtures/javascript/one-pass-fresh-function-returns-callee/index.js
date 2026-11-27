// A function passed for a parameter called once moves there, what it returns
// called or read off where the parameter's call is.
(function (fn) {
	fn()().prop();
})(function () {
	return function () {
		return {
			prop: function () {
				console.log("PASS");
			}
		};
	};
});
(function (fn) {
	fn().prop();
})(function () {
	return {
		prop: function () {
			console.log(typeof this);
		}
	};
});
(function (fn) {
	console.log(fn().length, fn()[0]);
})(function () {
	return "ab";
});
(function (fn) {
	console.log(fn()(2));
})(function () {
	var count = arguments.length;
	return function (value) {
		return value + count;
	};
});
(function (fn) {
	fn()`tagged`;
})(function () {
	return function (strings) {
		console.log(strings[0]);
	};
});
var object = {
	method: function () {
		console.log(this === object);
	}
};
(function (fn) {
	fn()();
})(function () {
	return object.method;
});
(function (fn) {
	new (fn())();
})(function () {
	return function () {
		console.log("constructed", typeof this);
	};
});
(function (fn) {
	console.log(fn().toFixed(1));
})(function () {
	return object.method.length + 1;
});
