"use strict";

const currentWatchStep = /** @type {{ step: string | undefined }} */ (
	require("../../../helpers/currentWatchStep")
);

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: () => {
		switch (currentWatchStep.step) {
			case "0":
				return ["./a.js", "./b.js", "./index.js"];
			case "1":
				return ["./b.js", "./a.js", "./index.js"];
			case "2":
				return ["./b.js", "./c.js", "./a.js", "./index.js"];
			default:
				return ["./a.js", "./a.js", "./index.js"];
		}
	}
};
