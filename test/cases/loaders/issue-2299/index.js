it("should be able to use loadModule multiple times within a loader, on files in different directories", function() {
	expect(require('!./loader/index.js!./a.json')).toEqual({
        a: expect.anything(),
        b: expect.anything(),
        c: expect.anything(),
    });
});
