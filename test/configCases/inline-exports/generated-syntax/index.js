import { minutesInDay } from "./constants.js";

const minutes = 2880;

it("should generated correct syntax", () => {
	let days = minutes / minutesInDay;
	expect(days).toBe(2);
	let then = false;
	if (minutes / minutesInDay) {
		then = true;
	}
	expect(then).toBe(true);
});
