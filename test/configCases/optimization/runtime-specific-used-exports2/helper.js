/**
 * @template T
 * @param {T[]} arr arr
 * @param {T[]} expected expected
 * @returns {boolean} is same
 */
export function isSame(arr, expected) {
	const set = new Set(arr);
	return expected.every(i => set.has(i));
}

/**
 * @param {Set<string>} files
 * @param {{files: string[]}[]} chunks
 */
export function addFiles(files, chunks) {
	chunks.forEach(ch => ch.files.forEach(f => files.add(f)));
}
