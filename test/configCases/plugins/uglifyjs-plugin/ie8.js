function t(a,b) {
    try {
        throw a+a;
    } catch(x) {
        b(x);
    }
}

module.exports = t;
