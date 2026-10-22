it("issue-1044: should not crash on missing spaces", function() {
	(function() {
		return"function"==typeof define&&define.amd?"hello":"world";
	})();
});
