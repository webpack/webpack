import css from "./style.css";
import trigger from "./trigger";

it("should not reuse embedded source rendered for another renderer", () => {
	expect(trigger).toBe(Number(WATCH_STEP));
	const marker = ["first", "second"][Number(WATCH_STEP)];
	expect(css).toContain(`/*${marker}*/`);
	expect(css).not.toContain(WATCH_STEP === "1" ? "/*first*/" : "/*second*/");
});
