import * as styles from "./style.module.css";

// `styles` is the CSS Modules name map at runtime. The same map is also
// written to `dist/style.module.css.json` at build time by the plugin in
// webpack.config.js — the native-CSS equivalent of postcss-modules `getJSON`.
document.body.className = styles.link;
