/**
 * MIT License http://www.opensource.org/licenses/mit-license.php
 * @author "Evgeny Reznichenko" <kusakyky@gmail.com>
 */


require.ensure(["./a.js"], function (error, require) {
    if (error) {
        // do something on error
        console.error(error);
    } else {
        require("./a.js");
    }
}, "a");
