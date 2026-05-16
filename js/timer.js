/**
 * ドリフト補正付きカウントダウンタイマー
 */
function CountdownTimer(duration, onTick, onExpire) {
  this.duration = duration;
  this.onTick = onTick;
  this.onExpire = onExpire;
  this._remaining = duration;
  this._startTime = null;
  this._intervalId = null;
  this._running = false;
}

CountdownTimer.prototype.start = function() {
  if (this._running) return;
  this._running = true;
  this._startTime = Date.now();
  var self = this;

  this._intervalId = setInterval(function() {
    var elapsed = (Date.now() - self._startTime) / 1000;
    var remaining = Math.max(0, self.duration - elapsed);
    self._remaining = remaining;

    if (typeof self.onTick === 'function') {
      self.onTick(Math.ceil(remaining));
    }

    if (remaining <= 0) {
      self.stop();
      if (typeof self.onExpire === 'function') {
        self.onExpire();
      }
    }
  }, 250);
};

CountdownTimer.prototype.stop = function() {
  if (this._intervalId !== null) {
    clearInterval(this._intervalId);
    this._intervalId = null;
  }
  this._running = false;
};

CountdownTimer.prototype.reset = function() {
  this.stop();
  this._remaining = this.duration;
  this._startTime = null;
};

CountdownTimer.prototype.getRemaining = function() {
  return Math.ceil(this._remaining);
};
