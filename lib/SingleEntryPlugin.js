/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const __esmDefault = /** @type {typeof import("./EntryPlugin.js").default} */ (
	require("./EntryPlugin.js")
);

export default __esmDefault;

export { __esmDefault as "module.exports" };
