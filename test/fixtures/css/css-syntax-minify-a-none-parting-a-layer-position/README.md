a `none` parting a layer's position

A layer takes one `<position>`, written as adjacent components, and it has no
initial keyword. So `right none bottom` holds two positions and the engine
drops it; dropping the `none` would revive it. A `none` beside the position
still goes.
