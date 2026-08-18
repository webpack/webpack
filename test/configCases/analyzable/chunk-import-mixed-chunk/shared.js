// `splitChunks` lifts this into a chunk the first entry has at startup and the second
// loads on demand, so it is served at two urls one public path apart.
export const load = () => import("./lazy.js");
