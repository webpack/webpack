// This can be parsed in two ways:
// a ? b : (c => ((d): e => f))
// a ? ((b): c => d) : (e => f)
a ? (b) : c => (d) : e => f;
