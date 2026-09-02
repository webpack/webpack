// The stylesheet loads through the runtime's url map, the script through `.ei`.
export const style = () => import("./lazy.css");
export const load = () => import("./async").then((m) => m.value);
