// Stays an ES module exporting nothing: an export the entry reads would have it
// ask for the export helpers itself, and a default the entry interops with would
// put `__webpack_require__.n` in the entry's own source.
export {};

const executed = [];

executed.push("side");

it("should execute the module that loads with the entry", () => {
	expect(executed).toEqual(["side"]);
});
