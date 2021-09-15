it("should provide a module to a called free var", function () {
	var x = xxx.yyy(xxx.yyy, xxx.yyy);
	expect(x).toBe("ok");
});
