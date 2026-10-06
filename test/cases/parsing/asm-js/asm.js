module.exports = function a() {
	function b() {
		"use asm";
		if (0 == 0) {
			return 1 == 1 ? 101 : 102;
		} else {
			return 0 == 1 ? 103 : 104;
		}
	}
	function c() {
		if (0 == 0) {
			return 1 == 1 ? 105 : 106;
		} else {
			return 0 == 1 ? 107 : 108;
		}
	}
	var d = (function() {
		"use asm";
		return 1 == 1 ? 109 : 110;
	})();
	return b() + c() + d;
};
