// Entry that references URL-based assets, so the `urlHints` parser rules
// have something to match. With the rules in `webpack.config.js`:
//   - font.woff2 → preload, as="font", type="font/woff2", fetchpriority="high"
//   - hero/banner.jpg → preload, as="image", fetchpriority="high"
//   - thumb.png → prefetch, fetchpriority="low"
const font = new URL("../fonts/inter.woff2", import.meta.url);
const hero = new URL("../hero/banner.jpg", import.meta.url);
const thumb = new URL("../thumb.png", import.meta.url);

// Explicit magic comment — wins over any `urlHints` rule for this URL.
const iconOverride = new URL(
	/* webpackPreload: true, webpackAs: "image" */ "../icon.png",
	import.meta.url
);

console.log(font.href, hero.href, thumb.href, iconOverride.href);
