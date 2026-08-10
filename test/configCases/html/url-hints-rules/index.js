const urls = [
	new URL("./inter.woff2", import.meta.url),
	new URL("./hero/banner.jpg", import.meta.url),
	new URL("./hero/pic.png", import.meta.url),
	new URL("./thumbs/a.png", import.meta.url),
	new URL("./site.webmanifest", import.meta.url),
	new URL("./robots.txt", import.meta.url),
	new URL("./brochure.pdf", import.meta.url),
	new URL(/* webpackPreload: true, webpackFetchPriority: "high" */ "./override.png", import.meta.url)
];
console.log(urls.map((url) => url.href).join(" "));
