let map1: { [P in string]: number; };
let map2: { readonly [P in string]?: number; };
let map3: { +readonly [P in string]+?: number; };
let map4: { -readonly [P in string]-?: number };
