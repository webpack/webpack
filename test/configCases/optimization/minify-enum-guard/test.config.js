"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).not.toContain("Color||");
		expect(code).not.toContain("Box||");
		expect(code).toContain("Box={size:1}.size");
		expect(code).not.toContain("unread||");
		expect(code).toContain("(Shape={})");
		expect(code).toContain("cache||(cache=[])");
		expect(code).toContain("store||(store={count:0})");
		expect(code).toContain("held||(held={})");
		expect(code).toContain("flag||(flag={})");
		expect(code).toContain("Early||{}");
	}
};
