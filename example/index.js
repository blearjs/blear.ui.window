'use strict';


var Window = require('../src/index');

var win = new Window();

win.setHTML('<div style="background: #fcc; height: 300px;"></div>');


document.getElementById('open').onclick = function () {
    win.open();
};


document.getElementById('resize').onclick = function () {
    win.resize();
};


document.getElementById('close').onclick = function () {
    win.close();
};
