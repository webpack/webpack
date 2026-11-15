const fs = require("fs");
const path = require("path");

const { beforeZero, stages } = JSON.parse(
	fs.readFileSync(path.join(__dirname, "stages.json"), "utf-8")
);

it("should keep stage zero after earlier asset processing", () => {
	expect(beforeZero).toEqual(["default", "negative"]);
});

it("should honor zero, negative, positive and default banner stages", () => {
	expect(stages).toEqual(["default", "negative", "zero", "positive"]);
});
