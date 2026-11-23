import { lonely } from "./lonely.js";

// a registry module of the scope's chunk, so it binds lonely through a self-import
export const getUrl = () =>
	new URL("./data.txt", import.meta.url).href.endsWith(".txt") && lonely() === "lonely";
