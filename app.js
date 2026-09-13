const SUITS = [
  { id: "S", label: "♠", color: "black", name: "スペード" },
  { id: "H", label: "♥", color: "red", name: "ハート" },
  { id: "D", label: "♦", color: "red", name: "ダイヤ" },
  { id: "C", label: "♣", color: "black", name: "クラブ" },
];

const RANKS = [
  { id: "A", trick: 5, points: 11 },
  { id: "10", trick: 4, points: 10 },
  { id: "K", trick: 3, points: 4 },
  { id: "Q", trick: 2, points: 3 },
  { id: "J", trick: 1, points: 2 },
];

const DEAL_TARGET = 66;
const MATCH_TARGET = 7;
const PLAYER_HUMAN = "human";
const PLAYER_CPU = "cpu";

const difficultyProfiles = {
  easy: { randomness: 0.7, closeBias: -10, claimBias: 0, leadBias: 0.7 },
  normal: { randomness: 0.22, closeBias: 3, claimBias: 2, leadBias: 1 },
  difficult: { randomness: 0.08, closeBias: 8, claimBias: 4, leadBias: 1.2 },
};

const state = {
  difficulty: "normal",
  darkMode: false,
  gamePoints: { human: 0, cpu: 0 },
  carryOver: 0,
  dealer: PLAYER_CPU,
  dealNumber: 0,
  players: {},
  stock: [],
  trumpCard: null,
  trumpSuit: null,
  trick: { leader: PLAYER_HUMAN, plays: { human: null, cpu: null } },
  stockClosed: false,
  closer: null,
  trickNumber: 0,
  dealFinished: false,
  matchFinished: false,
  log: [],
  actionToken: 0,
  overlayAction: null,
  overlayVisible: false,
};

const els = {
  difficulty: document.getElementById("difficulty"),
  darkModeToggle: document.getElementById("dark-mode-toggle"),
  newMatchButton: document.getElementById("new-match-button"),
  exchangeButton: document.getElementById("exchange-button"),
  closeButton: document.getElementById("close-button"),
  declareButton: document.getElementById("declare-button"),
  gameScore: document.getElementById("game-score"),
  dealScore: document.getElementById("deal-score"),
  phaseLabel: document.getElementById("phase-label"),
  dealNumber: document.getElementById("deal-number"),
  humanHand: document.getElementById("human-hand"),
  cpuHand: document.getElementById("cpu-hand"),
  trumpCard: document.getElementById("trump-card"),
  stockPile: document.getElementById("stock-pile"),
  talonCount: document.getElementById("talon-count"),
  leaderLabel: document.getElementById("leader-label"),
  humanTrickCard: document.getElementById("human-trick-card"),
  cpuTrickCard: document.getElementById("cpu-trick-card"),
  humanSummary: document.getElementById("human-summary"),
  cpuSummary: document.getElementById("cpu-summary"),
  humanWon: document.getElementById("human-won"),
  cpuWon: document.getElementById("cpu-won"),
  humanMarriages: document.getElementById("human-marriages"),
  cpuMarriages: document.getElementById("cpu-marriages"),
  log: document.getElementById("log"),
  animationLayer: document.getElementById("animation-layer"),
  scoreOverlay: document.getElementById("score-overlay"),
  scoreOverlayTitle: document.getElementById("score-overlay-title"),
  scoreOverlayBody: document.getElementById("score-overlay-body"),
};

function setup() {
  els.difficulty.addEventListener("change", () => {
    state.difficulty = els.difficulty.value;
    render();
  });
  els.darkModeToggle.addEventListener("change", () => {
    state.darkMode = els.darkModeToggle.checked;
    applyTheme();
  });
  els.newMatchButton.addEventListener("click", startNewMatch);
  els.exchangeButton.addEventListener("click", () => {
    if (canExchangeTrump(PLAYER_HUMAN)) {
      exchangeTrump(PLAYER_HUMAN);
      afterBetweenTricksAction();
    }
  });
  els.closeButton.addEventListener("click", () => {
    if (canCloseStock(PLAYER_HUMAN)) {
      closeStock(PLAYER_HUMAN);
      afterBetweenTricksAction();
    }
  });
  els.declareButton.addEventListener("click", () => {
    if (canDeclareVictory(PLAYER_HUMAN)) {
      declareVictory(PLAYER_HUMAN);
    }
  });
  els.scoreOverlay.addEventListener("click", closeOverlay);
  document.addEventListener("keydown", handleOverlayKeydown);
  startNewMatch();
}

function applyTheme() {
  document.body.classList.toggle("dark-mode", state.darkMode);
}

function nextActionToken() {
  state.actionToken += 1;
}

function scheduleAction(callback, delay) {
  const token = state.actionToken;
  window.setTimeout(() => {
    if (token !== state.actionToken) {
      return;
    }
    if (state.overlayVisible) {
      scheduleAction(callback, delay);
      return;
    }
    callback();
  }, delay);
}

function handleOverlayKeydown(event) {
  if (!state.overlayVisible) {
    return;
  }
  if (event.code !== "Space" && event.code !== "Enter") {
    return;
  }
  event.preventDefault();
  closeOverlay();
}

function showOverlay({ title, body, onClose = null }) {
  els.scoreOverlayTitle.textContent = title;
  els.scoreOverlayBody.textContent = body;
  state.overlayAction = onClose;
  state.overlayVisible = true;
  els.scoreOverlay.classList.add("visible");
  els.scoreOverlay.setAttribute("aria-hidden", "false");
}

function clearOverlay() {
  state.overlayAction = null;
  state.overlayVisible = false;
  els.scoreOverlay.classList.remove("visible");
  els.scoreOverlay.setAttribute("aria-hidden", "true");
}

function closeOverlay() {
  if (!state.overlayVisible) {
    return;
  }
  const pendingAction = state.overlayAction;
  clearOverlay();
  if (pendingAction) {
    pendingAction();
  }
}

function startNewMatch() {
  nextActionToken();
  clearOverlay();
  state.gamePoints = { human: 0, cpu: 0 };
  state.carryOver = 0;
  state.dealer = PLAYER_CPU;
  state.dealNumber = 0;
  state.matchFinished = false;
  state.log = [];
  addLog("新しい試合を始めました。7ゲームポイント先取です。");
  startNewDeal();
}

function startNewDeal() {
  nextActionToken();
  clearOverlay();
  state.dealNumber += 1;
  const deck = shuffle(createDeck());
  state.players = {
    human: createPlayerState(),
    cpu: createPlayerState(),
  };
  state.stockClosed = false;
  state.closer = null;
  state.dealFinished = false;
  state.trickNumber = 0;

  for (let index = 0; index < 5; index += 1) {
    state.players[PLAYER_HUMAN].hand.push(deck.pop());
    state.players[PLAYER_CPU].hand.push(deck.pop());
  }

  state.trumpCard = deck.pop();
  state.trumpSuit = state.trumpCard.suit;
  state.stock = deck;
  state.trick = {
    leader: otherPlayer(state.dealer),
    plays: { human: null, cpu: null },
  };
  state.dealer = otherPlayer(state.dealer);
  addLog(`新しいディールです。切札は${suitName(state.trumpSuit)}です。先手は${labelForPlayer(state.trick.leader)}です。`);
  sortHands();
  render();
  maybeRunCpuTurn();
}

function createPlayerState() {
  return {
    hand: [],
    trickPoints: 0,
    marriages: [],
    wonCards: [],
    wonTricks: 0,
  };
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit.id}-${rank.id}`,
        suit: suit.id,
        rank: rank.id,
      });
    }
  }
  return deck;
}

function shuffle(items) {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
}

function sortHands() {
  for (const playerKey of [PLAYER_HUMAN, PLAYER_CPU]) {
    state.players[playerKey].hand.sort((left, right) => {
      if (left.suit !== right.suit) {
        return left.suit.localeCompare(right.suit);
      }
      return rankValue(right.rank) - rankValue(left.rank);
    });
  }
}

function rankValue(rank) {
  return RANKS.find((entry) => entry.id === rank).trick;
}

function cardPoints(card) {
  return RANKS.find((entry) => entry.id === card.rank).points;
}

function otherPlayer(player) {
  return player === PLAYER_HUMAN ? PLAYER_CPU : PLAYER_HUMAN;
}

function labelForPlayer(player) {
  return player === PLAYER_HUMAN ? "あなた" : "CPU";
}

function suitLabel(suitId) {
  return SUITS.find((suit) => suit.id === suitId).label;
}

function suitColor(suitId) {
  return SUITS.find((suit) => suit.id === suitId).color;
}

function suitName(suitId) {
  return SUITS.find((suit) => suit.id === suitId).name;
}

function cardToText(card) {
  return `${suitLabel(card.suit)}${card.rank}`;
}

function getHandContainer(player) {
  return player === PLAYER_HUMAN ? els.humanHand : els.cpuHand;
}

function getTrickSlot(player) {
  return player === PLAYER_HUMAN ? els.humanTrickCard : els.cpuTrickCard;
}

function getCardElement(player, cardId) {
  return getHandContainer(player).querySelector(`[data-card-id="${cardId}"]`);
}

function getContainerCenterRect(element) {
  const rect = element.getBoundingClientRect();
  const width = 82;
  const height = 118;
  return {
    left: rect.left + Math.max(0, rect.width / 2 - width / 2),
    top: rect.top + Math.max(0, rect.height / 2 - height / 2),
    width,
    height,
  };
}

function animateCardFlight(card, fromRect, toRect, options = {}) {
  if (!fromRect || !toRect || !els.animationLayer) {
    return;
  }
  const flyingCard = createCardElement(card, true, null, {
    forceFaceUp: options.faceUp !== false,
    className: "flying-card",
  });
  flyingCard.style.left = `${fromRect.left}px`;
  flyingCard.style.top = `${fromRect.top}px`;
  flyingCard.style.width = `${fromRect.width}px`;
  flyingCard.style.height = `${fromRect.height}px`;
  els.animationLayer.appendChild(flyingCard);

  window.requestAnimationFrame(() => {
    flyingCard.style.left = `${toRect.left}px`;
    flyingCard.style.top = `${toRect.top}px`;
    flyingCard.style.width = `${toRect.width}px`;
    flyingCard.style.height = `${toRect.height}px`;
    flyingCard.style.transform = options.transform ?? "scale(0.98)";
    flyingCard.style.opacity = options.fadeOut ? "0.2" : "1";
  });

  window.setTimeout(() => {
    flyingCard.remove();
  }, options.duration ?? 360);
}

function announceDealPoints(player, gained, reason, onClose = null) {
  showOverlay({
    title: `${labelForPlayer(player)}が${gained}点獲得`,
    body: `${reason} 現在のディール得点: あなた ${state.players.human.trickPoints} - ${state.players.cpu.trickPoints} CPU`,
    onClose,
  });
}

function isStockOpen() {
  return !state.stockClosed && state.stock.length > 0;
}

function isLeaderTurn(player) {
  return !state.trick.plays[player] && state.trick.leader === player;
}

function currentFollower() {
  return otherPlayer(state.trick.leader);
}

function getLegalMoves(player) {
  const hand = state.players[player].hand;
  const leadCard = state.trick.plays[state.trick.leader];

  if (!leadCard) {
    if (state.trick.leader !== player) {
      return [];
    }
    return [...hand];
  }

  if (state.trick.leader === player) {
    return [];
  }

  if (isStockOpen()) {
    return [...hand];
  }

  const sameSuit = hand.filter((card) => card.suit === leadCard.suit);
  const strongerSameSuit = sameSuit.filter((card) => rankValue(card.rank) > rankValue(leadCard.rank));
  if (strongerSameSuit.length > 0) {
    return strongerSameSuit;
  }
  if (sameSuit.length > 0) {
    return sameSuit;
  }
  const trumps = hand.filter((card) => card.suit === state.trumpSuit);
  if (trumps.length > 0) {
    return trumps;
  }
  return [...hand];
}

function canPlayCard(player, cardId) {
  return getLegalMoves(player).some((card) => card.id === cardId);
}

function getMarriageOptions(player) {
  if (!isStockOpen() || !isLeaderTurn(player)) {
    return [];
  }
  const hand = state.players[player].hand;
  const declaredSuits = new Set(state.players[player].marriages.map((entry) => entry.suit));
  return SUITS.flatMap((suit) => {
    if (declaredSuits.has(suit.id)) {
      return [];
    }
    const king = hand.find((card) => card.suit === suit.id && card.rank === "K");
    const queen = hand.find((card) => card.suit === suit.id && card.rank === "Q");
    if (!king || !queen) {
      return [];
    }
    return [
      { cardId: king.id, suit: suit.id, points: suit.id === state.trumpSuit ? 40 : 20 },
      { cardId: queen.id, suit: suit.id, points: suit.id === state.trumpSuit ? 40 : 20 },
    ];
  });
}

function canExchangeTrump(player) {
  if (!isStockOpen() || !isLeaderTurn(player) || state.trick.plays.human || state.trick.plays.cpu) {
    return false;
  }
  if (state.players[player].wonTricks < 1) {
    return false;
  }
  return state.players[player].hand.some((card) => card.suit === state.trumpSuit && card.rank === "J");
}

function exchangeTrump(player) {
  const playerState = state.players[player];
  const jackIndex = playerState.hand.findIndex((card) => card.suit === state.trumpSuit && card.rank === "J");
  const jack = playerState.hand[jackIndex];
  playerState.hand.splice(jackIndex, 1, state.trumpCard);
  state.trumpCard = jack;
  addLog(`${labelForPlayer(player)}が切札のJを交換しました。`);
  sortHands();
  render();
}

function canCloseStock(player) {
  return isStockOpen() && isLeaderTurn(player);
}

function closeStock(player) {
  state.stockClosed = true;
  state.closer = player;
  addLog(`${labelForPlayer(player)}がクローズを宣言しました。以後はフォロー義務が発生します。`);
  render();
}

function canDeclareVictory(player) {
  if (state.dealFinished || state.matchFinished) {
    return false;
  }
  if (state.trick.plays.human || state.trick.plays.cpu) {
    return false;
  }
  return true;
}

function declareVictory(player) {
  finishDeal({
    declarer: player,
    manual: true,
  });
}

function playHumanCard(cardId, marriageSuit = null, sourceElement = null) {
  if (state.dealFinished || state.matchFinished) {
    return;
  }
  const player = PLAYER_HUMAN;
  if (!canPlayCard(player, cardId)) {
    addLog("そのカードは今は出せません。");
    return;
  }
  const afterPlay = marriageSuit
    ? () => declareMarriage(player, marriageSuit, () => continueAfterPlay(player))
    : () => continueAfterPlay(player);
  commitPlay(player, cardId, sourceElement, afterPlay);
}

function declareMarriage(player, suit, onClose = null) {
  const points = suit === state.trumpSuit ? 40 : 20;
  state.players[player].marriages.push({ suit, points });
  state.players[player].trickPoints += points;
  addLog(`${labelForPlayer(player)}が${points}点のマリッジを宣言しました。`);
  render();
  announceDealPoints(player, points, "マリッジ成立。", onClose);
}

function commitPlay(player, cardId, sourceElement = null, onAfterAnimation = null) {
  const playerState = state.players[player];
  const sourceRect = sourceElement?.getBoundingClientRect() ?? getCardElement(player, cardId)?.getBoundingClientRect();
  const cardIndex = playerState.hand.findIndex((entry) => entry.id === cardId);
  if (cardIndex < 0) {
    addLog(`${labelForPlayer(player)}のカード処理で不整合が起きたため、この操作を無効にしました。`);
    return;
  }
  const [card] = playerState.hand.splice(cardIndex, 1);
  state.trick.plays[player] = card;
  render();
  const targetRect = getTrickSlot(player).getBoundingClientRect();
  animateCardFlight(card, sourceRect, targetRect, { faceUp: player === PLAYER_HUMAN });
  if (onAfterAnimation) {
    scheduleAction(onAfterAnimation, 360);
    return;
  }
  continueAfterPlay(player);
}

function continueAfterPlay(player) {
  if (state.trick.plays.human && state.trick.plays.cpu) {
    scheduleAction(resolveTrick, 450);
    return;
  }

  const nextPlayer = otherPlayer(player);
  if (nextPlayer === PLAYER_CPU) {
    scheduleAction(maybeRunCpuTurn, 480);
  }
}

function resolveTrick() {
  const leadPlayer = state.trick.leader;
  const followPlayer = otherPlayer(leadPlayer);
  const leadCard = state.trick.plays[leadPlayer];
  const followCard = state.trick.plays[followPlayer];
  const winner = determineTrickWinner(leadPlayer, leadCard, followCard);
  const loser = otherPlayer(winner);
  const winnerState = state.players[winner];
  const totalPoints = cardPoints(leadCard) + cardPoints(followCard);

  winnerState.trickPoints += totalPoints;
  winnerState.wonCards.push(leadCard, followCard);
  winnerState.wonTricks += 1;
  state.trickNumber += 1;

  addLog(`${labelForPlayer(winner)}がトリックを獲得しました。${cardToText(leadCard)} 対 ${cardToText(followCard)}。`);
  let gainedPoints = totalPoints;

  const willDraw = !state.stockClosed && state.stock.length > 0;
  if (willDraw) {
    drawFromStock(winner);
    drawFromStock(loser);
  } else if (!state.stockClosed && state.stock.length === 0 && state.trickNumber === 10) {
    winnerState.trickPoints += 10;
    gainedPoints += 10;
    addLog(`${labelForPlayer(winner)}が最後のトリックで10点を獲得しました。`);
  }

  state.trick = {
    leader: winner,
    plays: { human: null, cpu: null },
  };
  sortHands();

  if (checkDealEnd()) {
    render();
    return;
  }

  render();
  announceDealPoints(
    winner,
    gainedPoints,
    "トリック獲得。",
    winner === PLAYER_CPU ? () => scheduleAction(maybeRunCpuTurn, 120) : null,
  );
}

function determineTrickWinner(leadPlayer, leadCard, followCard) {
  const trumpSuit = state.trumpSuit;
  if (followCard.suit === leadCard.suit) {
    return rankValue(followCard.rank) > rankValue(leadCard.rank) ? otherPlayer(leadPlayer) : leadPlayer;
  }
  if (followCard.suit === trumpSuit && leadCard.suit !== trumpSuit) {
    return otherPlayer(leadPlayer);
  }
  return leadPlayer;
}

function drawFromStock(player) {
  const playerState = state.players[player];
  const sourceRect = state.stock.length > 0
    ? els.stockPile.getBoundingClientRect()
    : state.trumpCard
      ? els.trumpCard.getBoundingClientRect()
      : null;
  let drawnCard = null;
  if (state.stock.length > 0) {
    drawnCard = state.stock.pop();
    playerState.hand.push(drawnCard);
  } else if (state.trumpCard) {
    drawnCard = state.trumpCard;
    playerState.hand.push(state.trumpCard);
    state.trumpCard = null;
  }
  if (!drawnCard) {
    return;
  }
  render();
  animateCardFlight(drawnCard, sourceRect, getContainerCenterRect(getHandContainer(player)), {
    faceUp: player === PLAYER_HUMAN,
    transform: "scale(1)",
  });
}

function checkDealEnd() {
  const noCardsLeft = state.players.human.hand.length === 0 && state.players.cpu.hand.length === 0;
  if (!noCardsLeft) {
    return false;
  }

  if (state.stockClosed && state.closer) {
    finishDeal({ declarer: state.closer, manual: false });
    return true;
  }

  const humanPoints = state.players.human.trickPoints;
  const cpuPoints = state.players.cpu.trickPoints;

  if (humanPoints === 65 && cpuPoints === 65) {
    state.dealFinished = true;
    addLog("65対65の同点です。このディールは得点なしです。");
    render();
    showOverlay({
      title: "ディール引き分け",
      body: "65対65の同点でした。クリック、Space、Enter で次のディール確認に進みます。",
      onClose: requestNextDeal,
    });
    return true;
  }

  if (humanPoints >= DEAL_TARGET && cpuPoints >= DEAL_TARGET && humanPoints === cpuPoints) {
    state.dealFinished = true;
    state.carryOver += 1;
    addLog(`66点以上で同点です。得点なしで終了し、次のディール勝者に${state.carryOver}点の繰り越しが加わります。`);
    render();
    showOverlay({
      title: "ディール引き分け",
      body: `66点以上で同点でした。次のディール勝者に${state.carryOver}ゲームポイントが加算されます。クリック、Space、Enter で次のディール確認に進みます。`,
      onClose: requestNextDeal,
    });
    return true;
  }

  if (humanPoints >= DEAL_TARGET || cpuPoints >= DEAL_TARGET) {
    const winner = humanPoints > cpuPoints ? PLAYER_HUMAN : PLAYER_CPU;
    awardGamePoints(winner, computeGamePoints(winner, otherPlayer(winner)), "最後までプレイ");
    return true;
  }

  const winner = humanPoints > cpuPoints ? PLAYER_HUMAN : PLAYER_CPU;
  awardGamePoints(winner, 1, "点数比較");
  return true;
}

function finishDeal({ declarer, manual }) {
  if (state.dealFinished) {
    return;
  }
  const defender = otherPlayer(declarer);
  const declarerPoints = state.players[declarer].trickPoints;
  const defenderPoints = state.players[defender].trickPoints;

  if (declarerPoints >= DEAL_TARGET) {
    const gamePoints = computeGamePoints(declarer, defender);
    awardGamePoints(declarer, gamePoints, manual ? "66点宣言成功" : "クローズ成立");
    return;
  }

  const punishment = state.players[declarer].trickPoints === 0 || state.players[defender].trickPoints === 0 ? 3 : 2;
  awardGamePoints(defender, punishment, manual ? "66点宣言失敗" : "クローズ失敗");
}

function computeGamePoints(winner, loser) {
  const loserPoints = state.players[loser].trickPoints;
  if (loserPoints === 0) {
    return 3;
  }
  if (loserPoints < 33) {
    return 2;
  }
  return 1;
}

function awardGamePoints(winner, rawPoints, reason) {
  const points = rawPoints + state.carryOver;
  state.carryOver = 0;
  state.gamePoints[winner] += points;
  state.dealFinished = true;
  addLog(`${labelForPlayer(winner)}が${reason}で${points}ゲームポイント獲得しました。`);

  if (state.gamePoints[winner] >= MATCH_TARGET) {
    state.matchFinished = true;
    addLog(`${labelForPlayer(winner)}が試合に勝利しました。`);
  }
  render();
  showOverlay({
    title: state.matchFinished ? `${labelForPlayer(winner)}の勝利` : `${labelForPlayer(winner)}がディール勝利`,
    body: `${reason} ${points}ゲームポイント獲得。現在のゲームポイント: あなた ${state.gamePoints.human} - ${state.gamePoints.cpu} CPU`,
    onClose: requestNextDeal,
  });
}

function maybeRunCpuTurn() {
  if (state.overlayVisible) {
    return;
  }
  if (state.dealFinished || state.matchFinished) {
    return;
  }
  if (state.trick.plays.cpu) {
    return;
  }
  // A follower must wait until the human leader has played.
  if (state.trick.leader === PLAYER_HUMAN && !state.trick.plays.human) {
    return;
  }
  if (state.trick.leader === PLAYER_CPU && !state.trick.plays.human) {
    cpuBetweenTricksDecisions();
    if (state.dealFinished) {
      render();
      return;
    }
  }
  const play = chooseCpuPlay();
  if (!play) {
    addLog("CPUの合法手が見つからなかったため、このターンを停止しました。");
    return;
  }
  const afterPlay = play.marriageSuit
    ? () => declareMarriage(PLAYER_CPU, play.marriageSuit, () => continueAfterPlay(PLAYER_CPU))
    : () => continueAfterPlay(PLAYER_CPU);
  commitPlay(PLAYER_CPU, play.cardId, getCardElement(PLAYER_CPU, play.cardId), afterPlay);
}

function requestNextDeal() {
  if (!(state.dealFinished || state.matchFinished)) {
    return;
  }
  showOverlay({
    title: state.matchFinished ? "新しい試合に進みます" : "次のディールに進みます",
    body: state.matchFinished
      ? "クリック、Space、Enter で新しい試合を開始します。"
      : "クリック、Space、Enter で次のディールを開始します。",
    onClose: () => {
      if (state.matchFinished) {
        startNewMatch();
        return;
      }
      startNewDeal();
    },
  });
}

function cpuBetweenTricksDecisions() {
  if (canExchangeTrump(PLAYER_CPU) && shouldCpuExchange()) {
    exchangeTrump(PLAYER_CPU);
  }
  if (canDeclareVictory(PLAYER_CPU) && shouldCpuDeclareVictory()) {
    declareVictory(PLAYER_CPU);
    return;
  }
  if (canCloseStock(PLAYER_CPU) && shouldCpuCloseStock()) {
    closeStock(PLAYER_CPU);
  }
}

function shouldCpuExchange() {
  const profile = difficultyProfiles[state.difficulty];
  const points = state.players.cpu.trickPoints;
  return points < 55 || Math.random() > profile.randomness;
}

function shouldCpuDeclareVictory() {
  const cpuPoints = state.players.cpu.trickPoints;
  return cpuPoints >= DEAL_TARGET;
}

function shouldCpuCloseStock() {
  const profile = difficultyProfiles[state.difficulty];
  const legalMoves = getLegalMoves(PLAYER_CPU);
  const handStrength = legalMoves.reduce((sum, card) => sum + rankValue(card.rank) + (card.suit === state.trumpSuit ? 1.6 : 0), 0);
  const cpuPoints = state.players.cpu.trickPoints;
  return cpuPoints + handStrength + profile.closeBias >= 72;
}

function estimateMarriageBonus(player) {
  return getMarriageOptions(player).reduce((best, option) => Math.max(best, option.points), 0);
}

function chooseCpuPlay() {
  const legalMoves = getLegalMoves(PLAYER_CPU);
  if (legalMoves.length === 0) {
    return null;
  }
  const marriageOptions = getMarriageOptions(PLAYER_CPU);
  const profile = difficultyProfiles[state.difficulty];
  const choices = legalMoves.map((card) => {
    const marriageOption = marriageOptions.find((option) => option.cardId === card.id);
    const score = evaluateCpuMove(card, marriageOption);
    return {
      cardId: card.id,
      score: score + Math.random() * profile.randomness * 12,
      marriageSuit: marriageOption ? marriageOption.suit : null,
    };
  });
  choices.sort((left, right) => right.score - left.score);
  return choices[0];
}

function evaluateCpuMove(card, marriageOption) {
  const profile = difficultyProfiles[state.difficulty];
  const lead = state.trick.leader === PLAYER_CPU && !state.trick.plays.human;
  const trumpBonus = card.suit === state.trumpSuit ? 4 : 0;
  const pointWeight = cardPoints(card) * (lead ? -0.25 : 0.45);
  const rankWeight = rankValue(card.rank) * (lead ? profile.leadBias : 1.8);
  let score = rankWeight + trumpBonus - pointWeight;

  if (marriageOption) {
    score += marriageOption.points * 0.62;
  }

  if (!lead) {
    const target = state.trick.plays.human;
    const wouldWin = determineTrickWinner(PLAYER_HUMAN, target, card) === PLAYER_CPU;
    score += wouldWin ? cardPoints(target) + 9 : -4;
    if (!isStockOpen()) {
      score += wouldWin ? 6 : -6;
    }
  } else {
    if (isStockOpen()) {
      score += card.rank === "J" ? 2 : 0;
      score -= card.rank === "A" ? 3 : 0;
    } else {
      score += card.rank === "A" || card.rank === "10" ? 3 : 0;
    }
  }

  return score;
}

function afterBetweenTricksAction() {
  render();
}

function render() {
  els.gameScore.textContent = `あなた ${state.gamePoints.human} - ${state.gamePoints.cpu} CPU`;
  els.dealScore.textContent = `あなた ${state.players.human?.trickPoints ?? 0} - ${state.players.cpu?.trickPoints ?? 0} CPU`;
  els.dealNumber.textContent = `第${state.dealNumber || 1}ディール`;
  els.phaseLabel.textContent = state.matchFinished
    ? "試合終了"
    : state.dealFinished
      ? "ディール終了"
      : state.stockClosed
        ? "クローズ中"
      : isStockOpen()
        ? "山札あり"
        : "フォロー義務あり";
  els.talonCount.textContent = state.trumpCard ? `残り ${state.stock.length + 1}枚` : `残り ${state.stock.length}枚`;
  els.leaderLabel.textContent = labelForPlayer(state.trick.leader);

  renderHand(PLAYER_HUMAN);
  renderCpuHand();
  renderSlot(els.humanTrickCard, state.trick.plays.human);
  renderSlot(els.cpuTrickCard, state.trick.plays.cpu);
  renderSlot(els.trumpCard, state.trumpCard);

  els.stockPile.style.visibility = state.stock.length > 0 ? "visible" : "hidden";
  els.humanSummary.textContent = `手札 ${state.players.human.hand.length}枚`;
  els.cpuSummary.textContent = `手札 ${state.players.cpu.hand.length}枚`;
  els.humanWon.textContent = `獲得トリック ${state.players.human.wonTricks}`;
  els.cpuWon.textContent = `獲得トリック ${state.players.cpu.wonTricks}`;
  els.humanMarriages.textContent = marriageSummary(PLAYER_HUMAN);
  els.cpuMarriages.textContent = marriageSummary(PLAYER_CPU);
  renderLog();

  els.exchangeButton.disabled = !canExchangeTrump(PLAYER_HUMAN);
  els.closeButton.disabled = !canCloseStock(PLAYER_HUMAN);
  els.declareButton.disabled = !canDeclareVictory(PLAYER_HUMAN);
}

function renderHand(player) {
  const container = els.humanHand;
  container.innerHTML = "";
  const marriageOptions = getMarriageOptions(player);

  for (const card of state.players[player].hand) {
    const legal = canPlayCard(player, card.id);
    const marriageOption = marriageOptions.find((option) => option.cardId === card.id);
    const cardEl = createCardElement(card, legal, marriageOption, { owner: player, cardId: card.id });
    cardEl.addEventListener("click", (event) => {
      if (!legal) {
        return;
      }
      playHumanCard(card.id, marriageOption ? marriageOption.suit : null, event.currentTarget);
    });
    container.appendChild(cardEl);
  }
}

function renderCpuHand() {
  els.cpuHand.innerHTML = "";
  const count = state.players.cpu.hand.length;
  for (let index = 0; index < count; index += 1) {
    const current = state.players.cpu.hand[index];
    const card = createCardElement(current, true, null, {
      owner: PLAYER_CPU,
      cardId: current.id,
      forceFaceUp: false,
    });
    els.cpuHand.appendChild(card);
  }
}

function createCardElement(card, legal = true, marriageOption = null, options = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = `card ${options.className ?? ""} ${suitColor(card.suit)}${legal ? "" : " disabled"}`.trim();
  if (options.owner) {
    wrapper.dataset.owner = options.owner;
  }
  if (options.cardId) {
    wrapper.dataset.cardId = options.cardId;
  }
  const faceUp = options.forceFaceUp !== false;
  if (faceUp) {
    wrapper.innerHTML = `
      <div class="card-rank">${card.rank}</div>
      <div class="card-suit">${suitLabel(card.suit)}</div>
      ${marriageOption ? `<div class="marriage-badge">+${marriageOption.points}</div>` : ""}
    `;
  }
  return wrapper;
}

function renderSlot(container, card) {
  container.innerHTML = "";
  if (!card) {
    return;
  }
  container.appendChild(createCardElement(card, true, null));
}

function marriageSummary(player) {
  if (state.players[player].marriages.length === 0) {
    return "マリッジ なし";
  }
  const total = state.players[player].marriages.reduce((sum, entry) => sum + entry.points, 0);
  return `マリッジ ${total}点`;
}

function renderLog() {
  els.log.innerHTML = "";
  for (const entry of [...state.log].reverse()) {
    const item = document.createElement("div");
    item.className = "log-entry";
    item.innerHTML = entry;
    els.log.appendChild(item);
  }
}

function addLog(text) {
  state.log.push(`<strong>${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</strong> ${text}`);
}

setup();
