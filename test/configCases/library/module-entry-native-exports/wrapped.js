// Referenced by the chunk it loads, so the entry can't be inlined and is rendered
// through the module registry — where the definitions it exports are read back.
export const answer = 7;

export const later = () => import("./consumer");
