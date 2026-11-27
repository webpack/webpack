(a ? (b = c) : d => e); // a ? (b = c) : (d => e)
(a ? (b += c) : d => e); // a ? (b += c) : (d => e)

(a ? (b = c) : d => e : f); // a ? ((b = c): d => e) : f
(a ? (b += c) : d => e : f); // ((a ? (b += c) : (d => e)) : f)

(a ? b => (c = d) : e => f); // a ? (b => (c = d)) : (e => f)
(a ? b => (c += d) : e => f); // a ? (b => (c += d)) : (e => f)

(a ? b => (c = d) : e => f : g); // a ? (b => ((c = d): e => f)) : g
(a ? b => (c += d) : e => f : g); // ((a ? (b => (c += d)) : (e => f)) : g)
