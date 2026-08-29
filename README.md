# 🃏 Texas Hold'em Arcade

Retro arcade-style Texas Hold'em poker — play against 3 bots right in your browser. No install, no account, just cards.

**▶️ Play now:** https://dacameragirl.github.io/texas-holdem-arcade/

![Texas Hold'em Arcade](https://img.shields.io/badge/status-playable-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🎮 How to Play

| Button | What it does |
|--------|-------------|
| **Fold** | Give up your hand |
| **Check** | Pass when no bet is facing you |
| **Call** | Match the current bet |
| **Bet / Raise** | Slider + Bet button — raise the stakes |

- **Blinds:** 5 / 10
- **Starting stack:** $1,000
- **Players:** You vs 3 bots
- Your current hand rank is shown under the message bar

The acting player glows yellow on the table. Buttons only unlock on your turn.

---

## 🧠 Features

- Full 52-card deck with proper shuffling
- Complete 7-card hand evaluator (Royal Flush → High Card)
- Pre-flop / Flop / Turn / River betting rounds
- Bot AI that plays off actual hand strength
- Retro arcade styling — green felt, gold trim, Press Start 2P font
- Single self-contained `index.html` — no build step, no dependencies except Google Fonts
- GitHub Pages ready

---

## 🛠 Fine-Tuning Roadmap

- [ ] Bot difficulty levels
- [ ] Sound effects / chip clinks
- [ ] All-in side pots
- [ ] Rebuy / player count options
- [ ] Mobile layout polish
- [ ] Hand history / stats

PRs and ideas welcome!

---

## 🚀 Run Locally

```bash
git clone https://github.com/DaCameraGirl/texas-holdem-arcade.git
cd texas-holdem-arcade
# then just open index.html in any browser
```

That's it. No npm, no build.

---

## 👥 Contributors

- **Angela Hudson** ([@DaCameraGirl](https://github.com/DaCameraGirl)) — project owner, design direction, QA / bug hunting
- **Cheetah** — initial game implementation, hand evaluator, bot AI, retro arcade UI

Built with ❤️ for Angela's retro arcade collection.

---

## 📄 License

MIT — do what you want, just keep the credits.
