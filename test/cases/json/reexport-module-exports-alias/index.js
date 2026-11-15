it("should unwrap a JSON key explicitly re-exported as module.exports", () => {
	expect(require("./esm.js")).toBe(1);
});
