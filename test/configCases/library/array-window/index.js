it("should define property in 'window' object", function() {
	expect(window["a"]["b"]).toBeDefined();
});
