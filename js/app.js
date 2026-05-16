/* ===== AppState ===== */
var AppState = {
  partType: null,
  phase: 'idle',
  practiceRound: 0,
  currentDigits: 2,
  trialIndex: 0,
  isBonus: false,
  currentSequence: [],
  correctAnswer: [],
  isSpeaking: false,
  isAwaitingAnswer: false,
  timerRemaining: 0,
  trial1Correct: null,
  trial2Correct: null,
  history: [],
  maxCorrectDigits: 0,
};

var _timer = null;

/* ===== 画面制御 ===== */
function hideAllScreens() {
  var screens = document.querySelectorAll('.screen');
  screens.forEach(function(s) { s.classList.remove('active'); });
}

function showScreen(id) {
  hideAllScreens();
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/* ===== 練習フロー ===== */
function startPracticeFlow(partType) {
  AppState.partType = partType;
  AppState.phase = 'practice';
  AppState.practiceRound = 0;
  AppState.maxCorrectDigits = 0;

  var config = PART_CONFIG[partType];

  document.getElementById('practice-part-label').textContent = config.label + ' 練習';
  document.getElementById('practice-rule-text').textContent = config.rule;
  document.getElementById('practice-status').textContent = '練習 1 / 2 ：読み上げ開始ボタンを押してください。';

  var feedbackArea = document.getElementById('practice-feedback');
  feedbackArea.hidden = true;
  feedbackArea.className = 'feedback-area';
  feedbackArea.innerHTML = '';

  document.getElementById('btn-practice-start').hidden = false;
  document.getElementById('btn-practice-start').disabled = false;
  document.getElementById('btn-test-start').hidden = true;

  showScreen('screen-practice');
}

function runPracticeQuestion() {
  var partType = AppState.partType;
  var round = AppState.practiceRound;
  var seq = PRACTICE_SEQUENCES[partType][round];
  var config = PART_CONFIG[partType];
  AppState.currentSequence = seq;
  AppState.correctAnswer = config.getAnswer(seq);

  var statusEl = document.getElementById('practice-status');
  statusEl.textContent = '練習 ' + (round + 1) + ' / 2 ：読み上げ中…';

  var btnStart = document.getElementById('btn-practice-start');
  btnStart.disabled = true;

  var feedbackArea = document.getElementById('practice-feedback');
  feedbackArea.hidden = true;

  AppState.isSpeaking = true;
  speakDigits(seq, function() {
    AppState.isSpeaking = false;
    statusEl.textContent = '練習 ' + (round + 1) + ' / 2 ：答えを入力してください（30秒）';

    // 練習用の簡易入力プロンプト（prompt()で代替）
    showPracticeInput();
  });
}

function showPracticeInput() {
  var round = AppState.practiceRound;
  var statusEl = document.getElementById('practice-status');

  // 練習用インラインフォームを動的生成
  var feedbackArea = document.getElementById('practice-feedback');
  feedbackArea.hidden = false;
  feedbackArea.className = 'feedback-area';
  feedbackArea.innerHTML =
    '<div class="feedback-seq">数字列：' + AppState.currentSequence.join(' ') + '</div>' +
    '<div style="display:flex;gap:10px;margin-top:10px;align-items:center;">' +
    '<input id="practice-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="回答を入力" style="flex:1;height:44px;border:2px solid #dce1e7;border-radius:8px;padding:8px 14px;font-size:1.1rem;" />' +
    '<button id="btn-practice-submit" class="btn btn-success">回答</button>' +
    '</div>';

  var practiceInput = document.getElementById('practice-input');
  var btnSubmit = document.getElementById('btn-practice-submit');

  practiceInput.addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9]/g, '');
  });

  practiceInput.focus();

  var _practiceTimer = new CountdownTimer(30, function(rem) {
    statusEl.textContent = '練習 ' + (round + 1) + ' / 2 ：残り ' + rem + ' 秒';
  }, function() {
    submitPracticeAnswer('');
  });
  _practiceTimer.start();

  btnSubmit.addEventListener('click', function() {
    _practiceTimer.stop();
    submitPracticeAnswer(practiceInput.value);
  });

  practiceInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      _practiceTimer.stop();
      submitPracticeAnswer(practiceInput.value);
    }
  });
}

function submitPracticeAnswer(inputStr) {
  var isCorrect = judgeAnswer(inputStr, AppState.correctAnswer);
  var feedbackArea = document.getElementById('practice-feedback');
  var statusEl = document.getElementById('practice-status');

  feedbackArea.className = 'feedback-area ' + (isCorrect ? 'correct' : 'wrong');
  feedbackArea.innerHTML =
    '<div class="feedback-seq">数字列：' + AppState.currentSequence.join(' ') + '</div>' +
    '<div class="feedback-result">' +
      (isCorrect ? '✓ 正解！　正答：' + AppState.correctAnswer.join('') : '✗ 不正解　正答：' + AppState.correctAnswer.join('')) +
    '</div>';

  AppState.practiceRound += 1;

  if (AppState.practiceRound < 2) {
    statusEl.textContent = '練習 2 / 2 ：読み上げ開始ボタンを押してください。';
    document.getElementById('btn-practice-start').disabled = false;
    document.getElementById('btn-practice-start').hidden = false;
  } else {
    statusEl.textContent = '練習終了！テスト開始ボタンを押してください。';
    document.getElementById('btn-practice-start').hidden = true;
    document.getElementById('btn-test-start').hidden = false;
  }
}

/* ===== テストフロー ===== */
function startTestFlow() {
  var config = PART_CONFIG[AppState.partType];
  AppState.phase = 'test';
  AppState.currentDigits = config.startDigits;
  AppState.trialIndex = 0;
  AppState.isBonus = false;
  AppState.trial1Correct = null;
  AppState.trial2Correct = null;
  AppState.history = [];
  AppState.maxCorrectDigits = 0;

  document.getElementById('test-part-label').textContent = config.label + ' テスト';
  document.getElementById('history-display').innerHTML = '';
  document.getElementById('countdown-display').hidden = true;
  document.getElementById('answer-form').hidden = true;
  document.getElementById('btn-question-start').disabled = false;
  document.getElementById('btn-question-start').hidden = false;

  updateTestStatus();
  showScreen('screen-test');
}

function updateTestStatus() {
  var statusEl = document.getElementById('test-status');
  var bonusLabel = AppState.isBonus ? '【ボーナス】' : '';
  statusEl.textContent = bonusLabel + AppState.currentDigits + '桁　第 ' + (AppState.trialIndex + 1) + ' 問　開始ボタンを押してください。';
}

function startQuestion() {
  var config = PART_CONFIG[AppState.partType];
  var seq = AppState.isBonus
    ? generateBonusSequence(AppState.currentDigits)
    : generateSequence(AppState.currentDigits);

  AppState.currentSequence = seq;
  AppState.correctAnswer = config.getAnswer(seq);
  AppState.isSpeaking = true;
  AppState.isAwaitingAnswer = false;

  var statusEl = document.getElementById('test-status');
  var bonusLabel = AppState.isBonus ? '【ボーナス】' : '';
  statusEl.textContent = bonusLabel + AppState.currentDigits + '桁　第 ' + (AppState.trialIndex + 1) + ' 問　読み上げ中…';

  document.getElementById('btn-question-start').disabled = true;
  document.getElementById('answer-form').hidden = true;
  document.getElementById('countdown-display').hidden = true;

  var answerInput = document.getElementById('answer-input');
  answerInput.value = '';
  answerInput.disabled = true;
  document.getElementById('btn-answer-submit').disabled = true;

  speakDigits(seq, function() {
    AppState.isSpeaking = false;
    AppState.isAwaitingAnswer = true;
    startAnswerPhase();
  });
}

function startAnswerPhase() {
  var statusEl = document.getElementById('test-status');
  var bonusLabel = AppState.isBonus ? '【ボーナス】' : '';
  statusEl.textContent = bonusLabel + AppState.currentDigits + '桁　第 ' + (AppState.trialIndex + 1) + ' 問　回答してください（30秒）';

  document.getElementById('answer-form').hidden = false;
  document.getElementById('countdown-display').hidden = false;

  var answerInput = document.getElementById('answer-input');
  answerInput.disabled = false;
  answerInput.value = '';
  answerInput.focus();
  document.getElementById('btn-answer-submit').disabled = false;

  var countdownValue = document.getElementById('countdown-value');
  countdownValue.textContent = '30';
  countdownValue.classList.remove('warning');

  if (_timer) {
    _timer.stop();
  }

  _timer = new CountdownTimer(30, function(rem) {
    countdownValue.textContent = rem;
    if (rem <= 10) {
      countdownValue.classList.add('warning');
    } else {
      countdownValue.classList.remove('warning');
    }
  }, function() {
    handleAnswerSubmit('');
  });

  _timer.start();
}

function handleAnswerSubmit(inputStr) {
  if (!AppState.isAwaitingAnswer) return;
  AppState.isAwaitingAnswer = false;

  if (_timer) {
    _timer.stop();
    _timer = null;
  }

  document.getElementById('answer-form').hidden = true;
  document.getElementById('countdown-display').hidden = true;
  document.getElementById('btn-question-start').disabled = false;

  var isCorrect = judgeAnswer(inputStr, AppState.correctAnswer);

  appendHistoryEntry(isCorrect, AppState.currentSequence, AppState.correctAnswer, inputStr);

  if (isCorrect && AppState.currentDigits > AppState.maxCorrectDigits) {
    AppState.maxCorrectDigits = AppState.currentDigits;
  }

  if (AppState.trialIndex === 0) {
    AppState.trial1Correct = isCorrect;
    AppState.trial2Correct = null;
    AppState.trialIndex = 1;
    nextQuestion();
  } else {
    AppState.trial2Correct = isCorrect;
    var action = decideProgression(AppState);

    if (action === 'next_digit') {
      AppState.currentDigits += 1;
      AppState.trialIndex = 0;
      AppState.trial1Correct = null;
      AppState.trial2Correct = null;
      nextQuestion();
    } else if (action === 'enter_bonus') {
      AppState.isBonus = true;
      AppState.currentDigits += 1;
      AppState.trialIndex = 0;
      AppState.trial1Correct = null;
      AppState.trial2Correct = null;
      startBonusStage();
    } else {
      endPart();
    }
  }
}

function nextQuestion() {
  updateTestStatus();
  document.getElementById('btn-question-start').hidden = false;
  document.getElementById('btn-question-start').disabled = false;
}

function startBonusStage() {
  var statusEl = document.getElementById('test-status');
  statusEl.textContent = '🎉 ボーナスステージ開始！　' + AppState.currentDigits + '桁　第 1 問　開始ボタンを押してください。';
  document.getElementById('btn-question-start').hidden = false;
  document.getElementById('btn-question-start').disabled = false;
}

function endPart() {
  showResult();
}

/* ===== 履歴追記 ===== */
function appendHistoryEntry(isCorrect, seq, correctAnswer, inputStr) {
  var entry = {
    isCorrect: isCorrect,
    seq: seq.slice(),
    correctAnswer: correctAnswer.slice(),
    input: inputStr,
    digits: AppState.currentDigits,
    isBonus: AppState.isBonus,
  };
  AppState.history.push(entry);

  var container = document.getElementById('history-display');
  var div = document.createElement('div');
  div.className = 'history-entry ' + (isCorrect ? 'correct' : 'wrong');

  var userInput = inputStr.replace(/[^0-9]/g, '');
  var displayInput = userInput === '' ? '（未回答）' : userInput;
  var bonusTag = entry.isBonus ? '[B] ' : '';

  div.innerHTML =
    '<span class="mark">' + (isCorrect ? '○' : '×') + '</span>' +
    '<span class="detail">' +
      '<div class="seq">' + bonusTag + entry.digits + '桁：' + seq.join(' ') + '</div>' +
      '<div class="answer-line">正答：' + correctAnswer.join('') + '　入力：' + displayInput + '</div>' +
    '</span>';

  container.insertBefore(div, container.firstChild);
}

/* ===== 結果表示 ===== */
function showResult() {
  var config = PART_CONFIG[AppState.partType];
  document.getElementById('result-part-label').textContent = config.label;
  document.getElementById('result-max-digits').textContent =
    AppState.maxCorrectDigits > 0 ? AppState.maxCorrectDigits + ' 桁' : '—';
  document.getElementById('result-bonus-label').textContent =
    AppState.isBonus ? '（ボーナスステージまで到達）' : '';
  showScreen('screen-result');
}

/* ===== 入力バリデーション ===== */
function setupInputValidation() {
  var input = document.getElementById('answer-input');
  input.addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9]/g, '');
  });
}

/* ===== DOMContentLoaded ===== */
document.addEventListener('DOMContentLoaded', function() {

  // 音声合成非対応チェック
  if (!isSupported()) {
    document.getElementById('speech-error').hidden = false;
  }

  setupInputValidation();

  // 読み上げ速度スライダー（練習・テスト両画面で共有、相互同期）
  function updateSpeedSettings(value) {
    var v = parseFloat(value);
    SpeechSettings.rate = v;
    document.querySelectorAll('.speech-rate-slider').forEach(function(s) {
      s.value = value;
    });
    document.querySelectorAll('.speed-label-display').forEach(function(l) {
      l.textContent = '×' + v.toFixed(1);
    });
  }

  document.querySelectorAll('.speech-rate-slider').forEach(function(slider) {
    slider.addEventListener('input', function() {
      updateSpeedSettings(this.value);
    });
  });

  // 読み上げモードトグル（つなげる / 区切る）
  document.querySelectorAll('.mode-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var mode = this.getAttribute('data-mode');
      SpeechSettings.joined = (mode === 'joined');
      // 全画面のセグメントボタンを同期
      document.querySelectorAll('.mode-btn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-mode') === mode);
      });
    });
  });

  // パート選択ボタン
  document.querySelectorAll('.part-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var part = this.getAttribute('data-part');
      startPracticeFlow(part);
    });
  });

  // 練習：読み上げ開始ボタン
  document.getElementById('btn-practice-start').addEventListener('click', function() {
    runPracticeQuestion();
  });

  // 練習→テスト開始ボタン
  document.getElementById('btn-test-start').addEventListener('click', function() {
    startTestFlow();
  });

  // 練習画面 TOPへ戻るボタン
  document.getElementById('btn-back-top').addEventListener('click', function() {
    if (_timer) { _timer.stop(); _timer = null; }
    window.speechSynthesis && window.speechSynthesis.cancel();
    resetAppState();
    showScreen('screen-top');
  });

  // テスト画面 TOPへ戻るボタン
  document.getElementById('btn-test-back-top').addEventListener('click', function() {
    if (_timer) { _timer.stop(); _timer = null; }
    window.speechSynthesis && window.speechSynthesis.cancel();
    resetAppState();
    showScreen('screen-top');
  });

  // テスト：開始ボタン
  document.getElementById('btn-question-start').addEventListener('click', function() {
    startQuestion();
  });

  // テスト：回答ボタン
  document.getElementById('btn-answer-submit').addEventListener('click', function() {
    if (!AppState.isAwaitingAnswer) return;
    var val = document.getElementById('answer-input').value;
    handleAnswerSubmit(val);
  });

  // テスト：Enterキーで回答
  document.getElementById('answer-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && AppState.isAwaitingAnswer) {
      handleAnswerSubmit(this.value);
    }
  });

  // 結果：もう一度ボタン（同パート練習から再開）
  document.getElementById('btn-restart').addEventListener('click', function() {
    var partType = AppState.partType;
    resetAppState();
    startPracticeFlow(partType);
  });

  // 結果：TOPへ戻るボタン
  document.getElementById('btn-to-top').addEventListener('click', function() {
    resetAppState();
    showScreen('screen-top');
  });
});

/* ===== AppState リセット ===== */
function resetAppState() {
  if (_timer) { _timer.stop(); _timer = null; }
  AppState.partType = null;
  AppState.phase = 'idle';
  AppState.practiceRound = 0;
  AppState.currentDigits = 2;
  AppState.trialIndex = 0;
  AppState.isBonus = false;
  AppState.currentSequence = [];
  AppState.correctAnswer = [];
  AppState.isSpeaking = false;
  AppState.isAwaitingAnswer = false;
  AppState.timerRemaining = 0;
  AppState.trial1Correct = null;
  AppState.trial2Correct = null;
  AppState.history = [];
  AppState.maxCorrectDigits = 0;
}
