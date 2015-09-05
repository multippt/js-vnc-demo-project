(function (w) {
  'use strict';

  function Screen(canvas) {
    this._canvas = canvas;
    this._context = canvas.getContext('2d');
  }
  
	function blobToImage(imageData) {
		if (Blob && 'undefined' != typeof URL) {
			var blob = new Blob([imageData], {type: 'image/png'});
			return URL.createObjectURL(blob);
		} else if (imageData.base64) {
			return 'data:image/png;base64,' + imageData.data;
		} else {
			return 'about:blank';
		}
	}

  Screen.prototype.drawRect = function (rect) {
    var img = new Image();
    var self = this;
    img.width = rect.width;
    img.height = rect.height;
    //img.src = 'data:image/png;base64,' + rect.image;
	img.src = blobToImage(rect.image);
    img.onload = function () {
      self._context.drawImage(this, rect.x, rect.y, rect.width, rect.height);
    };
  };

  Screen.prototype.addMouseHandler = function (cb) {
    var state = 0;
	var self = this;
	this._canvas.addEventListener('contextmenu', function(e) {
		e.preventDefault();
	});
    this._canvas.addEventListener('mousedown', this._onmousedown = function (e) {
		state = 1;
		if (e.button == 1) {
			state = 2;
		}
		if (e.button == 2) {
			state = 4;
		}
		var rect = self._canvas.getBoundingClientRect();
		var scaleX = self._canvas.width / rect.width;
		var scaleY = self._canvas.height / rect.height;
		var x = (e.pageX - rect.left) * scaleX;
		var y = (e.pageY - rect.top) * scaleY;

		console.log(e);
		cb.call(null, x, y, state);
		e.preventDefault();
    }, false);
    this._canvas.addEventListener('mouseup', this._onmouseup = function (e) {
		var rect = self._canvas.getBoundingClientRect();
		var scaleX = self._canvas.width / rect.width;
		var scaleY = self._canvas.height / rect.height;
		var x = (e.pageX - rect.left) * scaleX;
		var y = (e.pageY - rect.top) * scaleY;
      state = 0;
      cb.call(null, x, y, state);
      e.preventDefault();
    }, false);
    this._canvas.addEventListener('mousemove', this._onmousemove = function (e) {
		var rect = self._canvas.getBoundingClientRect();
		var scaleX = self._canvas.width / rect.width;
		var scaleY = self._canvas.height / rect.height;
		var x = (e.pageX - rect.left) * scaleX;
		var y = (e.pageY - rect.top) * scaleY;
      cb.call(null, x, y, state);
      e.preventDefault();
    });
  };

  Screen.prototype.addKeyboardHandlers = function (cb) {
    document.addEventListener('keydown', this._onkeydown = function (e) {
      cb.call(null, e.keyCode, e.shiftKey, 1);
      e.preventDefault();
    }, false);
    document.addEventListener('keyup', this._onkeyup = function (e) {
      cb.call(null, e.keyCode, e.shiftKey, 0);
      e.preventDefault();
    }, false);
  };

  Screen.prototype.removeHandlers = function () {
    document.removeEventListener('keydown', this._onkeydown);
    document.removeEventListener('keyup', this._onkeyup);
    this._canvas.removeEventListener('mouseup', this._onmouseup);
    this._canvas.removeEventListener('mousedown', this._onmousedown);
    this._canvas.removeEventListener('mousemove', this._onmousemove);
  };

  Screen.prototype.getCanvas = function () {
    return this._canvas;
  };

  w.Screen = Screen;
}(window));
