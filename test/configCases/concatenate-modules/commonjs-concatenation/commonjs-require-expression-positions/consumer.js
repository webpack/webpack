// Concatenation replaces the whole `require(...)` call, so every position below
// has to survive the substituted expression — ASI hazards included.

export const afterReturn = () => require("./values").value;

export const inTemplate = () => `${require("./values").value}!`;

export const tagged = () => require("./tag")`literal`;

export const computedMember = () => require("./values")["value"];

export const optionalChain = () => require("./values")?.value;

export const spreadArgument = () => Math.max(...require("./list").items);

export const forOfSubject = () => {
	const seen = [];
	for (const item of require("./list").items) seen.push(item);
	return seen;
};

export const voidResult = () => void require("./values");

export const typeofResult = () => typeof require("./values");

export const conditionalOperand = (flag) =>
	(flag ? require("./values") : require("./other")).value;

export const renamedDestructure = () => {
	const { value: renamed, missing = "fallback" } = require("./values");
	return [renamed, missing];
};

export const statementStart = () => {
	const previous = "before";
	require("./recorder").record(previous);
	return require("./recorder").records.slice();
};
