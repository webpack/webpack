import "./unchanged-module.js";
import "./unchanged-module.json";
new URL("./unchanged-module.svg", import.meta.url);
import "external";

export default "1";
