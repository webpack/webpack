globalThis.__firstEntryValue = await new Promise((resolve) => {
	setTimeout(() => resolve("first"), 0);
});
