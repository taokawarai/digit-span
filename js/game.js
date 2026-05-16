/* ===== PART_CONFIG ===== */
var PART_CONFIG = {
  forward: {
    label: '順唱',
    description: '読み上げた数字をそのままの順番で答えてください。',
    rule: '読み上げた数字を、そのまま同じ順番で入力してください。',
    startDigits: 2,
    normalMaxDigits: 9,
    bonusMaxDigits: 15,
    hasBonus: true,
    getAnswer: function(seq) { return seq.slice(); },
  },
  backward: {
    label: '逆唱',
    description: '読み上げた数字を逆の順番で答えてください。',
    rule: '読み上げた数字を、逆の順番で入力してください。',
    startDigits: 2,
    normalMaxDigits: 8,
    bonusMaxDigits: 15,
    hasBonus: true,
    getAnswer: function(seq) { return seq.slice().reverse(); },
  },
  sequence: {
    label: '整列',
    description: '読み上げた数字を小さい順（昇順）に並べ替えて答えてください。',
    rule: '読み上げた数字を、小さい順（昇順）に並べ替えて入力してください。',
    startDigits: 2,
    normalMaxDigits: 8,
    bonusMaxDigits: null,
    hasBonus: false,
    getAnswer: function(seq) { return seq.slice().sort(function(a, b) { return a - b; }); },
  },
};

/* ===== 日本語数字マッピング ===== */
var DIGIT_NAMES_JA = {
  0: 'ぜろ', 1: 'いち', 2: 'に', 3: 'さん', 4: 'よん',
  5: 'ご', 6: 'ろく', 7: 'なな', 8: 'はち', 9: 'きゅう'
};

/* ===== 練習問題（固定） ===== */
var PRACTICE_SEQUENCES = {
  forward:  [[3, 8, 2], [5, 1, 7]],
  backward: [[2, 4],    [5, 7, 4]],
  sequence: [[2, 8, 6], [3, 1, 9, 4]],
};

/**
 * ランダムな数字列を生成する（同じ数字は使わない）
 * @param {number} length
 * @returns {number[]}
 */
function generateSequence(length) {
  // 標準ステージは 1-9 のみ（WAIS-IV慣行：0は除外）
  var pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  // Fisher-Yates シャッフル
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, length);
}

/**
 * ボーナス用の数字列を生成する（10桁超は重複あり）
 * @param {number} length
 * @returns {number[]}
 */
function generateBonusSequence(length) {
  // ボーナスは 0-9 の復元抽出、連続同一数字なし
  var result = [];
  var prev = -1;
  while (result.length < length) {
    var d = Math.floor(Math.random() * 10);
    if (d !== prev) {
      result.push(d);
      prev = d;
    }
  }
  return result;
}

/**
 * 回答を判定する
 * @param {string} inputStr - ユーザーが入力した文字列
 * @param {number[]} correctAnswer - 正解の数字配列
 * @returns {boolean}
 */
function judgeAnswer(inputStr, correctAnswer) {
  var normalized = inputStr.replace(/[^0-9]/g, '');
  var correct = correctAnswer.join('');
  return normalized === correct;
}

/**
 * 進級・打ち切りを決定する
 * @param {object} state - AppState の参照
 * @returns {string} 'next_digit' | 'enter_bonus' | 'end_part'
 */
function decideProgression(state) {
  var config = PART_CONFIG[state.partType];
  var atLeastOneCorrect = state.trial1Correct || state.trial2Correct;

  if (!atLeastOneCorrect) {
    return 'end_part';
  }

  if (state.isBonus) {
    if (state.currentDigits < config.bonusMaxDigits) {
      return 'next_digit';
    } else {
      return 'end_part';
    }
  }

  if (state.currentDigits < config.normalMaxDigits) {
    return 'next_digit';
  }

  if (state.currentDigits === config.normalMaxDigits) {
    if (config.hasBonus) {
      return 'enter_bonus';
    } else {
      return 'end_part';
    }
  }

  return 'end_part';
}
