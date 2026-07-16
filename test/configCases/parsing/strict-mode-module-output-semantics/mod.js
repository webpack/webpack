// Sloppy CommonJS module: everything below parses in strict mode but throws
// once executed there — runtime-only hazards, so each is reported and the
// bundle still loads (none of these functions is called).
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

// The rest keeps its behavior in strict mode — no diagnostics.
__webpack_nonce__ = "nonce";

function computedAccess() {
	return arguments["callee"];
}

function assignsDeclared() {
	var declared = 1;
	declared = 2;
	declared++;
	return declared;
}

exports = module.exports = {
	usesCallee,
	usesCaller,
	recursesViaCallee,
	readsCalleeName,
	assignsUndeclared,
	updatesUndeclared,
	assignsReadOnlyGlobal,
	computedAccess,
	assignsDeclared,
	value: 42
};
