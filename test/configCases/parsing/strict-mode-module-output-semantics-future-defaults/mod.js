// Sloppy CommonJS module: these work today but throw once the ESM output
// runs in strict mode — each is reported.
function usesCallee() {
	return arguments.callee;
}

function usesCaller() {
	return arguments.caller;
}

function recursesViaCallee() {
	return arguments.callee();
}

function readsCalleeName() {
	return arguments.callee.name;
}

function assignsReadOnlyGlobal() {
	undefined = 1;
}

function updatesReadOnlyGlobal() {
	NaN++;
}

function assignsReadOnlyInfinity() {
	Infinity = 0;
}

function assignsEval() {
	eval = 1;
}

// The rest keeps its behavior in strict mode — no diagnostics.
class PrivateAccess {
	#p = 1;
	method() {
		return arguments.#p;
	}
}

function shadowsArguments() {
	var arguments = { callee: null };
	return arguments.callee;
}

function computedAccess() {
	return arguments["callee"];
}

function shadowsUndefined() {
	var undefined = 1;
	undefined = 2;
	return undefined;
}

module.exports = {
	usesCallee,
	usesCaller,
	recursesViaCallee,
	readsCalleeName,
	assignsReadOnlyGlobal,
	updatesReadOnlyGlobal,
	assignsReadOnlyInfinity,
	assignsEval,
	shadowsArguments,
	computedAccess,
	shadowsUndefined,
	value: 42
};
