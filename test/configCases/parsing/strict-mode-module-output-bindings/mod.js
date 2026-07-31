// Sloppy CommonJS module: every binding below is legal in a loose script, so
// acorn accepts it, but each one is a SyntaxError once the module is emitted
// into strict-mode ESM output — the bundle would not parse at all.
var eval = 1;
function static() {}
var namedExpression = function yield() {};
var { package } = { package: 1 };
var [private] = [1];
var interface = 2;

function reservedLocals() {
	var protected = 1;
	var public = 2;
	return protected + public;
}

let arguments = 3;

try {
	null.x;
} catch (implements) {}

// `await` is not strict-mode-reserved, but it is reserved in module code, so
// these break in ESM output for the same reason.
function awaitLocal() {
	var await = 4;
	return await;
}
class await {}

// Parameters are bindings too, including on arrow functions.
function reservedParam(static) {
	return static;
}
var arrowParam = (package) => package;
function awaitParam(await) {
	return await;
}

// A named class expression binds its name, same as a declaration.
var namedClass = class await {};

// Unaffected: reserved words are valid as property and method names.
var properties = { static: 1, public: 2, await: 3 };
var readsProperty = properties.static + properties.public;
var normalBinding = 5;

module.exports = {
	eval,
	static,
	namedExpression,
	package,
	private,
	interface,
	reservedLocals,
	arguments,
	awaitLocal,
	await,
	reservedParam,
	arrowParam,
	awaitParam,
	namedClass,
	readsProperty,
	normalBinding
};
