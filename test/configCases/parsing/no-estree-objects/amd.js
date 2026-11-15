define(["./dir/a.js", "./dir/b.js", "require", "exports"], function (a, b, require, exports) {
	if (Math.random() < 0) {
		require(["./dir/a.js"], function (again) {
			return again;
		});
	}
	return { a: a.name, b: b.name };
});
