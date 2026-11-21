var seen = [];
(function () {
	for (var key in make({ a: 1, b: 2 })) seen.push(key);
	function make(object) {
		seen.push("made");
		return object;
	}
})();
(function () {
	var twice = function (list) {
		return list.concat(list);
	};
	for (var i = 0, list = twice([1]); i < list.length; i++) seen.push(list[i]);
})();
(function () {
	function f() {}
	for (var j = 0; j < 2; j++) {
		for (var item of [f]) seen.push(item);
	}
	console.log(seen.slice(0, 5).join(), seen[5] === seen[6]);
})();
