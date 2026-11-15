export const readMap = name => import(`./context/${name}`).then(module => typeof module.default.map);
