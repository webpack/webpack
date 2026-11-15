function load(exports, require) {
	exports.run = function (value) {
		return check(value);
	};
	exports.again = function (value) {
		return check(value);
	};
	require("lib");
	var enabled = true;
	var disabled = 0;
	function check(value) {
		if (!enabled) return "off";
		if (disabled === 0) return "zero";
		return value;
	}
}
var exportsObject = {};
load(exportsObject, function () {});
console.log(exportsObject.run(1));
