'use strict';


var Window = require('../src/index');

var win = new Window();

win.setHTML('<div style="background: #fcc;height: 100%; min-height: 300px;"></div>');


document.getElementById('open').onclick = function () {
    win.open();
};


document.getElementById('resize').onclick = function () {
    win.resize({
        width: Math.random() * 100 + 200,
        height: Math.random() * 100 + 300
    });
};


document.getElementById('close').onclick = function () {
    win.close();
};
