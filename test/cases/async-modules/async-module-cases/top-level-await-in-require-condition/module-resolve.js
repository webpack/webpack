export const resolved = typeof require.resolve(
	(await Promise.resolve(false)) ? "./other" : "./value"
);
