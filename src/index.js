/**
 * window
 * @author ydr.me
 * @create 2016-04-20 14:49
 * @update 2018年06月21日16:22:35
 */


'use strict';

var object = require('blear.utils.object');
// var string = require('blear.utils.string');
var typeis = require('blear.utils.typeis');
// var number = require('blear.utils.number');
var fun = require('blear.utils.function');
var time = require('blear.utils.time');
var access = require('blear.utils.access');
var selector = require('blear.core.selector');
var attribute = require('blear.core.attribute');
var layout = require('blear.core.layout');
var modification = require('blear.core.modification');
// var event = require('blear.core.event');
var UI = require('blear.ui');
var template = require('./template.html', 'html');

var uiIndex = 0;
var namespace = UI.UI_CLASS + '-window';
var win = window;
var doc = win.document;
var htmlEl = doc.documentElement;
var bodyEl = doc.body;
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
var AUTO_STR = 'auto';
var NONE_STR = 'none';
var defaults = {
    /**
     * 定位
     * @type String
     */
    // position: 'fixed',

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
    height: AUTO_STR,

    /**
     * 左位移，默认自动计算
     * @type String | Number
     */
    left: AUTO_STR,

    /**
     * 上位移，默认自动计算
     * @type String | Number
     */
    top: AUTO_STR,

    /**
     * 最小宽度
     * @type Number|String
     */
    minWidth: NONE_STR,

    /**
     * 最小高度
     * @type Number|String
     */
    minHeight: NONE_STR,

    /**
     * 最大宽度
     * @type Number|String
     */
    maxWidth: NONE_STR,

    /**
     * 最大高度
     * @type Number|String
     */
    maxHeight: NONE_STR,

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

    // 动画参数
    animationOptions: {
        // 动画时间
        duration: 456,

        // 动画缓冲
        easing: 'linear'
    },

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
        // attribute.style(windowEl, 'position', options.position);
        the[_state] = WINDOW_STATE_HIDDEN;
        the[_outerEl] = options.render.call(the, windowEl, options) || the[_windowEl];
        modification.remove(the[_outerEl]);
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
     * @param [callback] {Function}
     * @returns {Window}
     */
    open: function (callback) {
        var the = this;
        var options = the[_options];

        callback = fun.ensure(callback);
        if (the[_state] !== WINDOW_STATE_HIDDEN) {
            callback.call(the);
            return the;
        }

        var pos = {
            visibility: 'visible'
        };

        the[_state] = WINDOW_STATE_OPENING;
        modification.insert(the[_outerEl]);
        // 设置显示，便于计算尺寸
        attribute.style(the[_windowEl], {
            display: 'block',
            visibility: 'hidden'
        });

        // 窗口打开之前
        if (the.emit('beforeOpen', pos) === false) {
            attribute.style(the[_windowEl], {
                display: 'none',
                visibility: 'visible'
            });
            the[_state] = WINDOW_STATE_HIDDEN;
            callback.call(the);
            modification.remove(the[_outerEl]);
            return the;
        }

        pos = object.assign({}, the[_getWillDisplayPosition](), pos);
        pos.zIndex = the[_zIndex] || UI.zIndex();
        the.emit('open', pos);
        attribute.style(the[_windowEl], pos);
        options.openAnimation.call(the, pos, function () {
            the[_state] = WINDOW_STATE_VISIBLE;
            the[_focusEl].focus();
            the.emit('afterOpen');
            callback.call(the);
        });

        return the;
    },

    /**
     * 更新 window 信息
     * @param [callback] {Function}
     * @returns {Window}
     */
    update: function (callback) {
        var the = this;

        if (the[_state] === WINDOW_STATE_VISIBLE) {
            return the.resize(callback);
        }

        callback = fun.ensure(callback);
        callback.call(the);

        return the;
    },

    /**
     * 调整位置，默认居中
     * @param [pos] {Object} 位置
     * @param [pos.width] {Number} 位置
     * @param [pos.height] {Number} 位置
     * @param [pos.top] {Number} 位置
     * @param [pos.left] {Number} 位置
     * @param [callback] {Function}
     * @returns {Window}
     */
    resize: function (pos, callback) {
        var the = this;
        var options = the[_options];
        var args = access.args(arguments);

        if (args.length === 1 && typeis.Function(args[0])) {
            callback = args[0];
            pos = {};
        }

        callback = fun.ensure(callback);

        if (the[_state] < WINDOW_STATE_OPENING || the[_state] > WINDOW_STATE_VISIBLE) {
            callback.call(the);
            return the;
        }

        // 等待窗口打开之后
        fun.until(function () {
            var centerPosition = the[_getWillDisplayPosition]();
            pos = object.assign(centerPosition, pos);
            the[_state] = WINDOW_STATE_RESIZING;
            the.emit('beforeResize', pos);
            time.nextFrame(function () {
                options.resizeAnimation.call(the, pos, function () {
                    the[_state] = WINDOW_STATE_VISIBLE;
                    the.emit('afterResize');
                    callback.call(the);
                });
            });
        }, function () {
            return the[_state] === WINDOW_STATE_VISIBLE;
        });

        return the;
    },

    /**
     * 关闭窗口
     * @param [callback] {Function}
     * @returns {Window}
     */
    close: function (callback) {
        var the = this;
        var options = the[_options];

        callback = fun.ensure(callback);
        if (the[_state] < WINDOW_STATE_OPENING || the[_state] > WINDOW_STATE_VISIBLE) {
            callback.call(the);
            return the;
        }

        // 等待窗口打开之后再关闭
        fun.until(function () {
            var pos = {};

            if (the.emit('beforeClose', pos) === false) {
                callback.call(the);
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
                modification.remove(the[_outerEl]);
                the.emit('afterClose');
                callback.call(the);
            });
        }, function () {
            return the[_state] === WINDOW_STATE_VISIBLE;
        });

        return the;
    },

    /**
     * 获取 outer element
     * @returns {HTMLDivElement}
     */
    getOuterEl: function () {
        return this[_outerEl];
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
     * 获取配置，不同继承者的参数不同，需要自行实现
     * @param [key]
     * @returns {*}
     */
    getOptions: function (key) {
        return UI.getOptions(this, _options, key);
    },

    /**
     * 获取配置，不同继承者的参数不同，需要自行实现
     * @param key
     * @param val
     * @returns {*}
     */
    setOptions: function (key, val) {
        return UI.setOptions(this, _options, key, val);
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

        callback = fun.ensure(callback);

        if (the[_state] === WINDOW_STATE_DESTROYED) {
            return;
        }

        fun.until(function () {
            the[_state] = WINDOW_STATE_DESTROYED;
            modification.remove(the[_outerEl]);
            Window.invoke('destroy', the);
            callback.call(the);
        }, function () {
            the.close();
            return the[_state] === WINDOW_STATE_HIDDEN;
        });
    }
});
var sole = Window.sole;
var _windowEl = sole();
var _focusEl = sole();
var _containerEl = sole();
var _options = sole();
var _getWillDisplayPosition = sole();
// window 状态：
var _state = sole();
var _zIndex = sole();
var _outerEl = sole();
var pro = Window.prototype;


/**
 * 获取将要显示的位置信息
 * @returns {{top: string, left: string, width: Number, height: Number, marginTop: Number, marginLeft: Number}}
 */
pro[_getWillDisplayPosition] = function (ext) {
    var the = this;
    var options = the[_options];

    attribute.style(the[_windowEl], {
        // 去除一切变换与过渡，保证位置计算准确
        transform: '',
        transition: '',
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
    var left = options.left;
    var top = options.top;

    // 左位移比例 && 自动左位移
    if (leftRate !== AUTO_STR && left === AUTO_STR) {
        left = (winWidth - theWidth) * leftRate;
        left = Math.max(left, 0);
    }

    // 上位移比例 && 自动上位移
    if (topRate !== AUTO_STR && top === AUTO_STR) {
        top = (winHeight - theHeight) * topRate;
        top = Math.max(top, 0);
    }

    return object.assign({
        top: top,
        left: left,
        width: theWidth,
        height: theHeight,
        // marginRight: marginRight,
        // marginBottom: marginBottom,
        // 不能设置最小、最大尺寸，在 IOS 下浏览器弹性滚动之后，浏览器的最大尺寸会发生变化
        // 同时会导致，ui.window 里的定位元素出现混乱
        minWidth: '',
        minHeight: '',
        maxWidth: '',
        maxHeight: ''
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
