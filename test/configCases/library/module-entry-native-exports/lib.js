// Standalone ESM entry, so it stays non-concatenated and is inlined at the top
// level: `export { … }` exposes the bindings and nothing reads the exports object.
export const answer = 42;

export function twice() {
	return answer * 2;
}
