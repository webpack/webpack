const state = useState<string>("");
const map = new Map<string, number[]>();
const set = new Set<number>;
const tagged = tag<string>`text`;
const instantiated = generic<number>;
const optionalCall = maybe?.method<string>();
const optionalDirect = maybe?.<number>();
const nested = outer<Array<Array<number>>>();
const comparison = a < b > c;
const lessAndGreater = a < b || c > d;
const compareCall = f<T>(x) < 1;
const notTypeArguments = b<c>-d;
const lineBreak = f<T>
(1);
