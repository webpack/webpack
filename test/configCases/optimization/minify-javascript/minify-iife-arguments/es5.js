it("should keep an ES5 call compatible with the target", function () {
	(function (value) {
		try {
			expect(value).toBe(0);
		} catch (error) {
			throw error;
		}
	})(new Date(0).getTime());
});
