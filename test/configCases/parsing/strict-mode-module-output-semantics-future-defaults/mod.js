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

function assignsUndeclared() {
	undeclaredGlobal = 1;
}

function updatesUndeclared() {
	undeclaredCounter++;
}

function assignsReadOnlyGlobal() {
	undefined = 1;
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

function assignsDeclared() {
	var declared = 1;
	declared = 2;
	declared++;
	return declared;
}

module.exports = {
	usesCallee,
	usesCaller,
	recursesViaCallee,
	readsCalleeName,
	assignsUndeclared,
	updatesUndeclared,
	assignsReadOnlyGlobal,
	assignsEval,
	shadowsArguments,
	computedAccess,
	assignsDeclared,
	value: 42
};
