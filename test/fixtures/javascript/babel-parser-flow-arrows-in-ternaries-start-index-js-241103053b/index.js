a ? (b) : c => d; // a ? b : (c => d)
a ? (b) : c => d : e; // a ? ((b): c => d) : e
a ? (b => c) : d => e; // a ? (b => c) : (d => e)
a ? b ? (c) : (d) : (e) => f : g; // a ? (b ? c : ((d): e => f)) : g
a ? async (b) : c => d; // a ? (async(b)) : (c => d)
