const readCopied = (name) =>
	__non_webpack_require__("fs").readFileSync(
		__non_webpack_require__("path").join(__dirname, "copied", name),
		"utf-8"
	);

it("should keep copied assets across hot updates", (done) => {
	expect(require("./module")).toBe("A");
	expect(readCopied("data.txt")).toBe("static");
	module.hot.accept("./module", () => {
		expect(require("./module")).toBe("B");
		expect(readCopied("data.txt")).toBe("static");
		done();
	});
	NEXT(require("../../update")(done));
});
