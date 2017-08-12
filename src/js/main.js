onload = () => {
    C = D.querySelector('canvas');
    C.width = CANVAS_WIDTH;
    C.height = CANVAS_HEIGHT;

    R = C.getContext('2d');

    // Shortcut for all canvas methods
    const p = CanvasRenderingContext2D.prototype;
    Object.getOwnPropertyNames(p).forEach(n => {
        if (R[n] && R[n].call) {
            w[n] = p[n].bind(R);
        }
    });

    onresize();

    // new Game();
};
