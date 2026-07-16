// `strictModeViolations: "error"` upgrades the diagnostic without futureDefaults.
function usesCallee() {
	return arguments.callee;
}

module.exports = { usesCallee, value: 42 };
