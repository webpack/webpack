exports.load = () => import(/* webpackChunkName: "shared" */ "./shared.css");
exports.loadPage = () => import(/* webpackChunkName: "page" */ "./page.css");
