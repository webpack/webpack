// The entry's own stylesheet is in the runtime chunk, whose hashes settle last.
import "./own.css";

export const style = () => import("./lazy.css");
