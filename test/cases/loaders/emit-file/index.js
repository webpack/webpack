import "./loader!./file";

it("should have the file emitted", () => {
	const result = __non_webpack_require__("./extra-file.js");
	expect(result).toBe("ok");
});
