it("should keep a sloppy parameter named let valid", function () {
	(function (let) {
		try {
			expect(let).toBe(0);
		} catch (error) {
			throw error;
		}
	})(new Date(0).getTime());
});
