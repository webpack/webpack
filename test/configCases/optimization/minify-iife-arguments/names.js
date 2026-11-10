it("should keep an anonymous function argument unnamed", function () {
	(function (value) {
		try {
			expect(value.name).toBe("");
			expect(value.name).toBe("");
		} catch (error) {
			throw error;
		}
	})(function () {});
});

it("should keep an anonymous arrow argument unnamed", function () {
	(function (value) {
		try {
			expect(value.name).toBe("");
			expect(value.name).toBe("");
		} catch (error) {
			throw error;
		}
	})(() => {});
});

it("should keep an anonymous class argument unnamed", function () {
	(function (value) {
		try {
			expect(value.name).toBe("");
			expect(value.name).toBe("");
		} catch (error) {
			throw error;
		}
	})(class {});
});
