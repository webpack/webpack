let union: number | null | undefined;
let intersection: number & string;
let precedence1: number | string & boolean;
let precedence2: number & string | boolean;

type J = number | string
type F = number & string
type K = | number | string
type M = & number & string
type N = | number
type O = & string
