var regexEscape = require("./regexEscape.js");

// These expect* methods are necessary because 'source' contains the code for this test file, which will always contain the string
// being tested for, so we have to use the "DO NOT MATCH BELOW..." technique to exclude the actual testing code from the test.
// Place your jest 'expect' calls below a line containing the DO NOT MATCH BELOW... string constructed below.  See other tests for examples.

// Break up the match string so we don't match it in these expect* functions either.
const doNotMatch = ["DO", "NOT", "MATCH", "BELOW", "THIS", "LINE"].join(" ");

function expectSourceToContain(source, str) {
	expect(source).toMatch(new RegExp(`${regexEscape(str)}.*${doNotMatch}`, "s"));
}
function expectSourceToMatch(source, regexStr) {
	expect(source).toMatch(new RegExp(`${regexStr}.*${doNotMatch}`, "s"));
}

module.exports = { expectSourceToContain, expectSourceToMatch };
