// A URL asset carrying webpackPreload — would normally emit a preload <link>.
const url = new URL(/* webpackPreload: true */ "./asset.png", import.meta.url);
console.log(url.href);
