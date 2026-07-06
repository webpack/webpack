const styles = {
	title: "main",
	aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
	cccccccccccccccccccccccccccccccccccccccc: "dddddddddddddddddddddddddddddddd",
	eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee: "ffffffffffffffffffffffffffffffff"
};

// Hoisted function export closing over a local object (the shape #17626 flagged,
// e.g. CSS modules). The minifier must fold `styles.title` and drop the unused
// keys even though the export escapes this chunk.
export function getTitle() {
	return styles.title;
}
