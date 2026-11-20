import wrap, { render } from "./shared/component.js";
import { formatValue } from "./shared/util.js";

export const html = () => wrap(render("a", formatValue("x")));
