"use strict";

const { describeCases } = require("./templates/HotTestCases");

describe("HotTestCases", () => {
	describeCases({
		name: "web",
		target: "web"
	});
});
