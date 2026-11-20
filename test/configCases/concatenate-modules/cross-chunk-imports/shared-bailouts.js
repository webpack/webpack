import { getPublicPath } from "./shared/public-path.js";
import { "with-dash" as dashed } from "./shared/string-name.js";
import { cjs } from "./shared/cjs.js";
import { required } from "./shared/required.js";
import { lonely } from "./shared/lonely.js";
import { getUrl } from "./shared/url.js";
import { dup } from "./dup/dup.js";
import { effect } from "./shared/effect.js";
import * as namespace from "./shared/namespace.js";
import * as context from "./shared/context.js";

export const bailouts = () => ({
	publicPath: getPublicPath(),
	dashed: dashed(),
	cjs,
	required: required(),
	lonely: lonely(),
	url: getUrl(),
	dup: dup(),
	effect,
	keys: Object.keys(namespace).sort(),
	context: context.read()
});
