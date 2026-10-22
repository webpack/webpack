export const push = (name) => {
	(globalThis.__writeBackOrder = globalThis.__writeBackOrder || []).push(name);
};
