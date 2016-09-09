/**
 * window
 * @author ydr.me
 * @create 2016-04-20 14:49
 */


'use strict';

var object = require('blear.utils.object');
var string = require('blear.utils.string');
var typeis = require('blear.utils.typeis');
var number = require('blear.utils.number');
var fun = require('blear.utils.function');
var time = require('blear.utils.time');
var selector = require('blear.core.selector');
var attribute = require('blear.core.attribute');
var layout = require('blear.core.layout');
var modification = require('blear.core.modification');
var event = require('blear.core.event');
var UI = require('blear.ui');
var template = require('./template.html', 'html');

var uiIndex = 0;
var namespace = UI.UI_CLASS + '-window';
var win = window;
var doc = win.document;
// 0 隐藏/已经关闭
var WINDOW_STATE_HIDDEN = 0;
// 1 正在打开
var WINDOW_STATE_OPENING = 1;
// 2 正在改变尺寸
var WINDOW_STATE_RESIZING = 2;
// 3 已打开
var WINDOW_STATE_VISIBLE = 3;
// 4 正在关闭
var WINDOW_STATE_CLOSING = 4;
// 5 已经销毁
var WINDOW_STATE_DESTROYED = 5;
var defaultAnimation = function (to, done) {
    attribute.style(this.getWindowEl(), to);
    done();
};
var defaults = {
    /**
     * 定位
     * @type String
     */
    position: 'fixed',

    // /**
    //  * 自动层级管理
    //  * @type Boolean
    //  */
    // autoZIndex: true,

    /**
     * 宽度
     * @type Number
     */
    width: 600,

    /**
     * 高度
     * @type Number|String
     */
    height: 'auto',

    /**
     * 最小宽度
     * @type Number|String
     */
    minWidth: 'none',

    /**
     * 最小高度
     * @type Number|String
     */
    minHeight: 'none',

    /**
     * 最大宽度
     * @type Number|String
     */
    maxWidth: 'none',

    /**
     * 最大高度
     * @type Number|String
     */
    maxHeight: 'none',

    /**
     * 上边距占比
     * @type Number
     */
    topRate: 1 / 2,

    /**
     * 左边距占比
     * @type Number
     */
    leftRate: 1 / 2,

    /**
     * 添加的类
     * @type String
     */
    addClass: '',

    /**
     * 打开窗口的动画
     * @type Null|Function
     */
    openAnimation: null,

    /**
     * 窗口尺寸改变的动画
     * @type Null|Function
     */
    resizeAnimation: null,

    /**
     * 关闭窗口的动画
     * @type Null|Function
     */
    closeAnimation: null,

    /**
     * 自定义渲染器
     * @param windowEl
     * @param options
     */
    render: function (windowEl, options) {

    }
};
var Window = UI.extend({
    className: 'Window',
    constructor: function (options) {
        var the = this;

        Window.parent(the);
        options = the[_options] = object.assign(true, {}, defaults, options);
        options.openAnimation = options.openAnimation || defaultAnimation;
        options.resizeAnimation = options.resizeAnimation || defaultAnimation;
        options.closeAnimation = options.closeAnimation || defaultAnimation;

        // init node
        var windowEl = the[_windowEl] = modification.parse(template);
        attribute.addClass(windowEl, options.addClass);
        the[_focusEl] = selector.query('.' + namespace + '-focus', windowEl)[0];
        the[_containerEl] = selector.query('.' + namespace + '-container', windowEl)[0];
        windowEl.id = namespace + '-' + uiIndex++;
        attribute.style(windowEl, 'position', options.position);
        the[_state] = WINDOW_STATE_HIDDEN;
        modification.insert(windowEl);
        options.render.call(the, windowEl, options);
    },


    /**
     * 获得窗口的尺寸
     * @returns {{width:Number, height:Number, top:Number, left:Number}}
     */
    getSize: function () {
        return attribute.style(this[_windowEl], ['width', 'height', 'top', 'left']);
    },


    /**
     * 设置三维高度
     * @param zIndex {Number} 三维高度
     * @returns {Window}
     */
    zIndex: function (zIndex) {
        var the = this;

        the[_zIndex] = zIndex;

        return the;
    },


    /**
     * 打开窗口
     * @returns {Window}
     */
    open: function () {
        var the = this;
        var options = the[_options];

        time.nextTick(function () {
            if (the[_state] !== WINDOW_STATE_HIDDEN) {
                return the;
            }

            var pos = {
                visibility: 'visible'
            };

            the[_state] = WINDOW_STATE_OPENING;
            // 设置显示，便于计算尺寸
            attribute.style(the[_windowEl], {
                display: 'block',
                visibility: 'hidden'
            });

            if (the[_shouldUpdate]) {
                the[_shouldUpdate] = false;
                the[_lastPosition] = null;
            }

            // 窗口打开之前
            if (the.emit('beforeOpen', pos) === false) {
                attribute.style(the[_windowEl], {
                    display: 'none',
                    visibility: 'visible'
                });
                the[_state] = WINDOW_STATE_HIDDEN;
                return the;
            }

            the[_lastPosition] = the[_lastPosition] || the[_getCenterPosition]();
            pos = object.assign({}, the[_lastPosition], pos);
            pos.zIndex = the[_zIndex] || UI.zIndex();
            the.emit('open', pos);
            attribute.style(the[_windowEl], pos);
            options.openAnimation.call(the, pos, function () {
                the[_state] = WINDOW_STATE_VISIBLE;
                the[_focusEl].focus();
                the.emit('afterOpen');
            });
        });

        return the;
    },


    /**
     * 更新 window 信息
     * @returns {Window}
     */
    update: function () {
        var the = this;

        if (the[_state] === WINDOW_STATE_VISIBLE) {
            return the.resize();
        }

        // 标记需要更新
        the[_shouldUpdate] = true;

        return the;
    },


    /**
     * 调整位置，默认居中
     * @param [pos] {Object} 位置
     * @param [pos.width] {Number} 位置
     * @param [pos.height] {Number} 位置
     * @param [pos.top] {Number} 位置
     * @param [pos.left] {Number} 位置
     * @returns {Window}
     */
    resize: function (pos) {
        var the = this;
        var options = the[_options];

        time.nextTick(function () {
            if (the[_state] < WINDOW_STATE_OPENING || the[_state] > WINDOW_STATE_VISIBLE) {
                return the;
            }

            // 等待窗口打开之后
            fun.until(function () {
                object.assign(options, pos);
                var centerPosition = the[_getCenterPosition]();
                the[_lastPosition] = object.assign(centerPosition, pos);
                the[_state] = WINDOW_STATE_RESIZING;
                pos = object.assign(true, {}, the[_lastPosition]);
                the.emit('beforeResize', pos);
                time.nextFrame(function () {
                    options.resizeAnimation.call(the, pos, function () {
                        the[_state] = WINDOW_STATE_VISIBLE;
                        the.emit('afterResize');
                    });
                });
            }, function () {
                return the[_state] === WINDOW_STATE_VISIBLE;
            });
        });

        return the;
    },


    /**
     * 关闭窗口
     * @returns {Window}
     */
    close: function () {
        var the = this;
        var options = the[_options];

        time.nextTick(function () {
            if (the[_state] < WINDOW_STATE_OPENING || the[_state] > WINDOW_STATE_VISIBLE) {
                return the;
            }

            // 等待窗口打开之后再关闭
            fun.until(function () {
                var pos = {};

                if (the.emit('beforeClose', pos) === false) {
                    return;
                }

                the[_state] = WINDOW_STATE_CLOSING;
                the[_focusEl].blur();
                the.emit('close', pos);
                options.closeAnimation.call(the, pos, function () {
                    attribute.style(the[_windowEl], {
                        display: 'none'
                    });
                    the[_state] = WINDOW_STATE_HIDDEN;
                    the.emit('afterClose');
                });
            }, function () {
                return the[_state] === WINDOW_STATE_VISIBLE;
            });
        });

        return the;
    },


    /**
     * 获取 window element
     * @returns {HTMLDivElement}
     */
    getWindowEl: function () {
        return this[_windowEl];
    },


    /**
     * 获取 container element
     * @returns {HTMLDivElement}
     */
    getContainerEl: function () {
        return this[_containerEl];
    },


    /**
     * 获取配置
     * @returns {*}
     */
    getOptions: function () {
        return object.assign(true, {}, this[_options]);
    },


    /**
     * 设置 HTML
     * @param html {String|Node}
     * @returns {HTMLElement}
     */
    setHTML: function (html) {
        var the = this;

        if (typeis.String(html)) {
            attribute.html(the[_containerEl], html);
        } else if (html && html.nodeType) {
            modification.empty(the[_containerEl]);
            modification.insert(html, the[_containerEl]);
        }

        the.update();
        return selector.children(the[_containerEl])[0];
    },


    /**
     * 销毁实例
     */
    destroy: function (callback) {
        var the = this;

        callback = fun.noop(callback);

        if (the[_state] === WINDOW_STATE_DESTROYED) {
            return;
        }

        fun.until(function () {
            the[_state] = WINDOW_STATE_DESTROYED;
            modification.remove(the[_windowEl]);
            Window.parent.destroy(the);
            callback.call(the);
        }, function () {
            the.close();
            return the[_state] === WINDOW_STATE_HIDDEN;
        });
    }
});
var _windowEl = Window.sole();
var _focusEl = Window.sole();
var _containerEl = Window.sole();
var _options = Window.sole();
var _getCenterPosition = Window.sole();
var _lastPosition = Window.sole();
var _shouldUpdate = Window.sole();
// window 状态：
var _state = Window.sole();
var _zIndex = Window.sole();
var pro = Window.prototype;


/**
 * 获取元素的中间位置的信息
 * @returns {{top: string, left: string, width: Number, height: Number, marginTop: Number, marginLeft: Number}}
 */
pro[_getCenterPosition] = function (ext) {
    var the = this;
    var options = the[_options];

    attribute.style(the[_windowEl], {
        width: options.width,
        height: options.height,
        minWidth: options.minWidth,
        minHeight: options.minHeight,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight
    });

    var theWidth = layout.outerWidth(the[_windowEl]);
    var theHeight = layout.outerHeight(the[_windowEl]);
    var winWidth = layout.width(win);
    var winHeight = layout.height(win);
    var leftRate = options.leftRate;
    var topRate = options.topRate;
    var left = 'auto';
    var top = 'auto';

    if (leftRate !== 'auto') {
        left = (winWidth - theWidth) * leftRate;
        left = Math.max(number.parseFloat(left), 0);
    }

    if (topRate !== 'auto') {
        top = (winHeight - theHeight) * topRate;
        top = Math.max(number.parseFloat(top), 0);
    }

    return object.assign({
        top: top,
        left: left,
        width: theWidth,
        height: theHeight
    }, ext);
};

require('./style.css', 'css|style');
Window.defaults = defaults;


/**
 * @class ui/Window
 * @extends UI
 * @property extend
 */
module.exports = Window;
