// A `var` no declarator sets reads `undefined` wherever it is read.
!function () {
	console.log(unset === void 0 ? "PASS" : "FAIL");
	var unset;
}();
console.log(
	(function (missing) {
		return missing === void 0;
	})()
);
console.log(
	(function (present, missing) {
		return [present === void 0, missing === void 0, missing?.length];
	})(1)
);
(function (callback) {
	callback && callback();
})();
console.log((function (missing) {
	return missing.length;
})({ length: 2 }));
// Written, looped over or declared twice, a name keeps its reads.
console.log(
	(function (object) {
		var key;
		for (key in object);
		return key === void 0;
	})({ a: 1 })
);
console.log(
	(function (list) {
		for (var item of list);
		var item;
		return item === void 0;
	})([1])
);
console.log(
	(function () {
		var twice;
		var twice = 1;
		return twice === void 0;
	})()
);
console.log(
	(function (written) {
		written = 2;
		return written === void 0;
	})()
);
console.log(
	(function (evaluated) {
		return eval("evaluated") === void 0;
	})()
);
function both(value) {
	return value === void 0;
}
console.log(both(), both(1));
// A computed key reads the value: a name nothing sets keys as `undefined`.
console.log(
	(function () {
		var unsetKey;
		return [Object.keys({ [unsetKey]: 1 }), { [unsetKey]: 2 }.undefined];
	})()
);
