// Sloppy CommonJS module: everything below parses in strict mode but throws
// once executed there — runtime-only hazards, so each is reported and the
// bundle still loads (none of the reported functions is called).
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

function computedCallee() {
	return arguments["callee"];
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

// The rest keeps its behavior in strict mode — no diagnostics.
function dynamicAccess(key) {
	return arguments[key];
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
	computedCallee,
	assignsReadOnlyGlobal,
	updatesReadOnlyGlobal,
	assignsReadOnlyInfinity,
	dynamicAccess,
	shadowsUndefined,
	value: 42
};
