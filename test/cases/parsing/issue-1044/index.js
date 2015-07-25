it("should not crash on missing spaces", function() {
	(function() {
		return"function"==typeof define&&define.amd?"hello":"world";
	})();
});
