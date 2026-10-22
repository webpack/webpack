export const push = (name) => {
	(globalThis.__inlineOrder = globalThis.__inlineOrder || []).push(name);
};
