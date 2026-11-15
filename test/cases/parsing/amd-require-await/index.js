it("should not move an await of the caller into the AMD require wrapper", function () {
	function callback() {}
	async function load() {
		require(["./a"], await Promise.resolve(callback));
	}
	return load().then(
		function () {
			throw new Error("should not resolve");
		},
		function (error) {
			expect(error.code).toBe("MODULE_NOT_FOUND");
		}
	);
});

it("should not move an await of the caller out of an AMD require array", function () {
	async function load() {
		require([(await Promise.resolve(0), "./a")]);
	}
	return load().then(
		function () {
			throw new Error("should not resolve");
		},
		function (error) {
			expect(error).toBeInstanceOf(Error);
		}
	);
});

it("should not move a yield of the caller into the AMD require wrapper", function () {
	function callback() {}
	function* load() {
		require(["./a"], yield callback);
	}
	expect(function () {
		load().next();
	}).toThrow("Cannot find module");
});
