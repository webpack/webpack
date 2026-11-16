import text from "./text.css";

it("should inline the current text of an @import into a text export", () => {
	const tone = WATCH_STEP === "1" ? "green" : "blue";
	expect(text).toContain(`.imported { color: ${tone}; }`);
	expect(text).toContain(".text { color: red; }");
});
