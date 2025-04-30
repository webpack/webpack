async function run() {
	const mod = "module.js"

	await import(`./generated/${mod}`);
}
