export const load = () => import("./lazy.css");
---
export const load = () =>
	Promise.all([import("./lazy.css"), import("./lazy2.css")]);
