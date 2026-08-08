import { value } from "./barrel";
import { shared } from "./shared";

it("should reverse concat connection copies on incremental rebuild", () => {
	expect(value).toBe(WATCH_STEP);
	expect(shared).toBe("shared");
});
