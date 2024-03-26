
import { ExtendedError, a } from "./library";

const { expectSourceToContain } = require("../../../helpers/expectSource");

it("should not create an invalid extends clause", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8").toString();

	// Reference the imports to generate uses in the source.

	const f = false;
	if (f) {
		console.log(a);
	}

	/************ DO NOT MATCH BELOW THIS LINE ************/

	// This currently fails because webpack generates invalid JS: "class ExtendedError extends (/* unused pure expression or super */ null && (Error)) {"
	expectSourceToContain(source, 'export class ExtendedError extends Error');
});


