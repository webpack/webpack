function a() { const [unused, used] = g(); return used; }
function b() { const [unused, used] = [1, f()]; return used; }
