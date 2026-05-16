/**
 * Web Speech API ラッパー
 */

/**
 * 音声合成がサポートされているか確認する
 * @returns {boolean}
 */
function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * 数字列を日本語で読み上げる
 * @param {number[]} digits - 読み上げる数字の配列
 * @param {function} onComplete - 読み上げ完了時のコールバック
 */
function speakDigits(digits, onComplete) {
  if (!isSupported()) {
    if (typeof onComplete === 'function') {
      onComplete();
    }
    return;
  }

  window.speechSynthesis.cancel();

  var utterances = digits.map(function(d, i) {
    var utter = new SpeechSynthesisUtterance(DIGIT_NAMES_JA[d]);
    utter.lang = 'ja-JP';
    utter.rate = 0.9;
    if (i === digits.length - 1) {
      utter.onend = function() {
        if (typeof onComplete === 'function') {
          onComplete();
        }
      };
    }
    return utter;
  });

  utterances.forEach(function(u) {
    window.speechSynthesis.speak(u);
  });
}
