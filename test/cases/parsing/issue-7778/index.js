it("should detect query strings in dynamic import as a static value 1 ", function() {
    import("./a?queryString").then(({ default: a }) => {
        expect(a()).toBe("a");
    });
});

it("should detect query strings in dynamic import as a static value 2", function() {
    var testFileName = "a";
    
    import(`./${testFileName}?queryStringSteven`).then(({ default: a }) => {
        expect(a()).toBe("a");
    });
});