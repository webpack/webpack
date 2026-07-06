// Standalone ESM entry (no imports) so it stays non-concatenated and inlined;
// topLevelDeclarations then come from module.buildInfo, not code-gen data.
export let count = 0;

export function tick() {
	count += 1;
}
