globalThis.__firstEntryValue = await new Promise((resolve) => {
	// Slower than the other entry, so awaiting only the last one fails here.
	setTimeout(() => resolve("first"), 50);
});
