it("should not include a module with a weak dependency using context", function() {
	var fileA = "a";
	var fileB = "b";
	var fileC = "c";

	var resolveWeakA = require.resolveWeak("./" + fileA);
	var resolveWeakB = require.resolveWeak("./" + fileB);
	var resolveWeakC = require.resolveWeak("./" + fileC);

	var a = Boolean(__webpack_modules__[resolveWeakA]);
	var b = Boolean(__webpack_modules__[resolveWeakB]);
	var c = Boolean(__webpack_modules__[resolveWeakC]);

	require(["./b"]);
	require("./c");

	expect(resolveWeakA).toBeDefined();
	expect(resolveWeakB).toBeDefined();
	expect(resolveWeakC).toBeDefined();

	expect(a).toBe(false);
	expect(b).toBe(false);
	expect(c).toBe(true);
});
