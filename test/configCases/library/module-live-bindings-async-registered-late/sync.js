export let syncCount = 10;

export function bumpSync() {
	syncCount++;
}

export function then() {
	throw new Error("A synchronous export is not a promise");
}
