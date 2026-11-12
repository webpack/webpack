const fs = require("fs");
const path = require("path");
const left = require("./left");
const right = require("./right");

it("should update the complete entry tree before entry callbacks", () => {
	expect(left).toBe(Number(WATCH_STEP));
	expect(right).toBe(Number(WATCH_STEP));
	for (let index = 0; index < 2; index++) {
		expect(
			JSON.parse(
				fs.readFileSync(path.join(__dirname, `entry-tree${index}.json`), "utf8")
			)
		).toEqual([Number(WATCH_STEP), Number(WATCH_STEP)]);
	}
});
