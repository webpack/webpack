a `<style>` whose sheet minifies to nothing splits no word

Under a renderer, `<p>` minifies to no CSS, so `removeEmptyElements` drops the

`<style>` and `=` and `-->` print as one word, as the `display: none` source renders.
