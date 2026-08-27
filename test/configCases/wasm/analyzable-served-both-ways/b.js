// Dynamically here, so the loader fetches a second copy through the public path.
export const load = () => import("./shared");
