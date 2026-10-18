/* eslint-disable no-eval */
export let value = eval("42");
export let other = 7;
export let arrow = () => eval("value");
export let nested = () => () => eval("other");
export let assigned = 0;
export let fromAssignment = (assigned = eval("43"));
export let fromNestedEval = eval('eval("44")');
export let fromSequence = (eval("40"), eval("47"));
export let update = (next) => eval("value = next; other = next + 1");

// prettier-ignore
export let [destructured] = [5], last = eval("46")

export var loopPattern, loopValue;
for (
	var [loopPattern] = [0], loopValue = eval("49");
	loopPattern < 1;
	loopPattern++
) {
	// No body writes may hide an incorrectly initialized export.
}

export let loop = () => {
	// prettier-ignore
	for (value of [50]) eval("other = value + 1")
};
