"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs
			.readdirSync(options.output.path)
			.filter((file) => file.endsWith(".js"))
			.map((file) =>
				fs.readFileSync(path.join(options.output.path, file), "utf8")
			)
			.join("\n");
		// A name holding a primitive that only its dropped update reads goes too.
		expect(code).not.toContain("droppedLetUpdate");
		expect(code).not.toContain("droppedVarUpdate");
		expect(code).not.toContain("secondChunkUpdate");
		// What may hold an object, or is read later, keeps its update.
		expect(code).toContain("readUpdate++");
		expect(code).toContain("paramUpdate++");
		expect(code).toContain("callUpdate++");
		expect(code).toContain("redeclaredUpdate++");
		expect(code).toContain("patternUpdate++");
		expect(code).toContain(".p++");
	}
};
