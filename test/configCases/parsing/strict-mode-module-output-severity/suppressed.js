// Violations here are silenced by `strictModeViolations: false` on the rule.
function usesCallee() {
	return arguments.callee;
}

function assignsReadOnlyGlobal() {
	undefined = 1;
}

module.exports = { usesCallee, assignsReadOnlyGlobal, value: 1 };
