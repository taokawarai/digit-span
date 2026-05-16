/**
 * Web Speech API ラッパー
 */

/**
 * 読み上げ設定
 *   rate     : 各数字の読み上げ速度（SpeechSynthesisUtterance.rate）
 *   interval : 数字と数字の間の無音時間（ms）
 * app.js のスライダーから updateSpeedSettings() 経由で変更される
 */
var SpeechSettings = { rate: 0.9, interval: 500 };

/**
 * 音声合成がサポートされているか確認する
 * @returns {boolean}
 */
function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * 数字列を日本語で読み上げる
 * interval=0 の場合は全数字を1つの Utterance に結合して読み上げ
 * （ブラウザが utterance 間に入れるオーバーヘッドを完全に除去）
 * interval>0 の場合は onend+setTimeout の連鎖で間隔を制御
 * @param {number[]} digits - 読み上げる数字の配列
 * @param {function} onComplete - 読み上げ完了時のコールバック
 */
function speakDigits(digits, onComplete) {
  if (!isSupported()) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  window.speechSynthesis.cancel();

  var rate = SpeechSettings.rate;
  var interval = SpeechSettings.interval;

  function afterWarmup() {
    if (interval === 0) {
      // 間隔なしモード：全数字を1つの utterance にまとめて読む
      var text = digits.map(function(d) { return DIGIT_NAMES_JA[d]; }).join(' ');
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = rate;
      u.onend = function() { if (typeof onComplete === 'function') onComplete(); };
      window.speechSynthesis.speak(u);
    } else {
      // 間隔ありモード：onend + setTimeout の連鎖
      var i = 0;
      (function speakOne() {
        if (i >= digits.length) {
          if (typeof onComplete === 'function') onComplete();
          return;
        }
        var u = new SpeechSynthesisUtterance(DIGIT_NAMES_JA[digits[i]]);
        u.lang = 'ja-JP';
        u.rate = rate;
        u.onend = function() {
          i++;
          if (i < digits.length) {
            setTimeout(speakOne, interval);
          } else {
            if (typeof onComplete === 'function') onComplete();
          }
        };
        window.speechSynthesis.speak(u);
      })();
    }
  }

  // 無音ウォームアップ：cancel() 直後の最初の発話がクリッピングされる問題を防ぐ
  var warmup = new SpeechSynthesisUtterance('\u00A0');
  warmup.lang = 'ja-JP';
  warmup.volume = 0;
  warmup.rate = rate;
  warmup.onend = afterWarmup;
  window.speechSynthesis.speak(warmup);
}
