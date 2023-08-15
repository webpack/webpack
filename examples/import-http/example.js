async function main() {
	const pMap1 = await __non_webpack_import__("https://cdn.skypack.dev/p-map");
	const pMap2 = await __non_webpack_import__("https://cdn.esm.sh/p-map");
	const pMap3 = await __non_webpack_import__("https://jspm.dev/p-map");
	const pMap4 = await __non_webpack_import__("https://unpkg.com/p-map-series?module"); // unpkg doesn't support p-map :(
	console.log(pMap1);
	console.log(pMap2);
	console.log(pMap3);
	console.log(pMap4);
}

main()
