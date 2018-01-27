it("should evaluate require.resolve as truthy value", function() {
	var id;
	if(require.resolve)
		id = require.resolve("./module.js");

	expect(typeof id === "number" || typeof id === "string").toBeTruthy();
});

it("should evaluate require.resolve in ?: expression", function() {
	var id = require.resolve ? require.resolve("./module.js") : null;

	expect(typeof id === "number" || typeof id === "string").toBeTruthy();
});
