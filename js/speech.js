/**
 * Web Speech API ラッパー
 */

/** 読み上げ速度設定（app.js のスライダーから変更される） */
var SpeechSettings = { rate: 0.9, joined: true };

/**
 * 音声合成がサポートされているか確認する
 * @returns {boolean}
 */
function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * 数字列を日本語で読み上げる
 * joined=true  : 全数字を1つの Utterance に結合（間なし）
 * joined=false : 各数字を個別 Utterance で読み上げ（rate に応じた間隔あり）
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
  var joined = SpeechSettings.joined;

  function afterWarmup() {
    if (joined) {
      // 連続モード：全数字を1つの utterance にまとめる
      var text = digits.map(function(d) { return DIGIT_NAMES_JA[d]; }).join(' ');
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = rate;
      u.onend = function() { if (typeof onComplete === 'function') onComplete(); };
      window.speechSynthesis.speak(u);
    } else {
      // 区切りモード：onend + setTimeout の連鎖（間隔は rate に反比例）
      var interval = Math.max(50, Math.round(400 / rate));
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
          if (i < digits.length) { setTimeout(speakOne, interval); }
          else { if (typeof onComplete === 'function') onComplete(); }
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
