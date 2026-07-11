// Pure CommonJS module: parsed as a loose script, so acorn does not reject
// these strict-mode-only violations — but the ESM output runs in strict mode.
var foo = 2;
delete foo;

var obj = { x: 1 };
delete obj.x; // member delete stays valid, must not be reported

with (obj) {
	foo = x;
}

var octalNumber = 0777;
var octalStringA = "\047"; // octal escape (\0 followed by a digit)
var octalStringB = "\47"; // octal escape (\1-\7)
var notOctalA = "\\048"; // escaped backslash, not an octal escape
var notOctalB = "\0"; // NUL escape, valid

function dup(a, a) {
	return a;
}

eval = 1;
arguments = 2;

module.exports = { foo, obj, octalNumber, octalStringA, octalStringB, dup };
