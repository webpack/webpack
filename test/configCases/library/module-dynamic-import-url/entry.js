export default async function getNumber() {
	const num = (await import("./chunk.js")).default;
	return 1 + num();
}
