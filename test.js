const fs = require("fs");
const vm = require("vm");

function loadGame() {
  let code = fs.readFileSync("./app.js", "utf8");
  code = code.replace(/setup\(\);\s*$/, "");

  function stub() {
    return {
      addEventListener() {},
      appendChild() {},
      querySelector() { return null; },
      getBoundingClientRect() { return { left: 0, top: 0, width: 82, height: 118 }; },
      setAttribute() {},
      remove() {},
      style: {},
      innerHTML: "",
      textContent: "",
      disabled: false,
      className: "",
      classList: {
        add() {},
        remove() {},
      },
    };
  }

  const context = {
    console,
    document: {
      getElementById: () => stub(),
      createElement: () => stub(),
      addEventListener: () => {},
    },
    window: {
      setTimeout: (fn) => {
        fn();
        return 0;
      },
      clearTimeout: () => {},
      requestAnimationFrame: (fn) => {
        fn();
        return 0;
      },
    },
    Date,
    Math,
  };

  vm.createContext(context);
  vm.runInContext(
    `${code}
this.__exports = {
  state,
  getLegalMoves,
  determineTrickWinner,
  canExchangeTrump,
  computeGamePoints,
  finishDeal,
  awardGamePoints,
  chooseCpuPlay,
  shouldCpuDeclareVictory,
  otherPlayer
};`,
    context,
  );
  return context.__exports;
}

function card(suit, rank) {
  return { id: `${suit}-${rank}`, suit, rank };
}

function player(hand = []) {
  return {
    hand,
    trickPoints: 0,
    marriages: [],
    wonCards: [],
    wonTricks: 0,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runTests() {
  const game = loadGame();

  game.state.players = {
    human: player([card("S", "A"), card("H", "J")]),
    cpu: player([card("S", "10")]),
  };
  game.state.trumpSuit = "H";
  game.state.stock = [];
  game.state.stockClosed = true;
  game.state.trick = {
    leader: "cpu",
    plays: { cpu: card("S", "10"), human: null },
  };
  assert(
    JSON.stringify(game.getLegalMoves("human").map((entry) => entry.id)) === JSON.stringify(["S-A"]),
    "山札終了後は同スートのフォローが強制されるべきです。",
  );

  game.state.players.human.hand = [card("S", "A"), card("S", "J"), card("H", "J")];
  assert(
    JSON.stringify(game.getLegalMoves("human").map((entry) => entry.id)) === JSON.stringify(["S-A"]),
    "勝てる同スートがあるなら、それを出す必要があります。",
  );

  game.state.players.human.hand = [card("C", "A"), card("H", "J")];
  assert(
    JSON.stringify(game.getLegalMoves("human").map((entry) => entry.id)) === JSON.stringify(["H-J"]),
    "同スートがなく切札を持つなら、切札を出す必要があります。",
  );

  assert(
    game.determineTrickWinner("human", card("S", "10"), card("S", "A")) === "cpu",
    "同スートでは強いカードが勝つべきです。",
  );
  assert(
    game.determineTrickWinner("human", card("S", "A"), card("H", "J")) === "cpu",
    "切札は他スートに勝つべきです。",
  );

  game.state.players = {
    human: player([card("H", "J")]),
    cpu: player(),
  };
  game.state.players.human.wonTricks = 1;
  game.state.trumpSuit = "H";
  game.state.stock = [card("C", "A")];
  game.state.trumpCard = card("H", "10");
  game.state.stockClosed = false;
  game.state.trick = { leader: "human", plays: { human: null, cpu: null } };
  assert(game.canExchangeTrump("human") === true, "先手であれば切札交換できるべきです。");

  game.state.trick = { leader: "cpu", plays: { human: null, cpu: null } };
  assert(game.canExchangeTrump("human") === false, "先手でない場合は切札交換できないべきです。");

  game.state.players = {
    human: player(),
    cpu: player(),
  };
  game.state.players.human.trickPoints = 66;
  game.state.players.cpu.trickPoints = 10;
  assert(game.computeGamePoints("human", "cpu") === 2, "相手が33点未満なら2ゲームポイントのはずです。");

  game.state.players.cpu.trickPoints = 52;
  assert(game.shouldCpuDeclareVictory() === false, "CPU は 66 点未満で勝利宣言してはいけません。");

  game.state.players.cpu.trickPoints = 66;
  assert(game.shouldCpuDeclareVictory() === true, "CPU は 66 点以上でのみ勝利宣言すべきです。");

  console.log("All tests passed");
}

runTests();
