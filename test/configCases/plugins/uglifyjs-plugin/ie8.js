function t(e) {
    return function(error) {
        try {
            e()
        } catch(e) {
            error(e)
        }
    }
}

module.exports = t;
