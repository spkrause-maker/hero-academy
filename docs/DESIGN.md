# Game design

How Hero Academy works, and why it ended up this way. For the learning science behind these choices, see [RESEARCH.md](RESEARCH.md).

## The story

A villain is attacking your school. His force shield is made of **15 multiplication facts**. Every fact you master powers up a hero and cracks one piece of the shield. Power up all 15 heroes and you can face him in a final battle.

The 15 facts are the ones left after a child knows their 1s, 5s, 9s, 10s and 11s. Each fact is a hero card. Families set each hero's picture and name in **Parent setup**, ideally using the child's own drawings. The game ships with no character art, only colored placeholder badges.

## The core loop

```
For each of 3 chapters:
  1. Learn the chapter's power   →  a short training lesson (required)
  2. Power up its heroes         →  daily missions until every hero is powered
Then:
  3. Final battle                →  a mission mixing all 15 facts
```

### Chapters

| Chapter | Team | Power (strategy) | Heroes |
|---|---|---|---|
| 1 | The Doublers | Double, then double again | 4×4, 4×6, 4×7, 4×8, 8×6, 8×7, 8×8 |
| 2 | Trio Force | 2 groups + 1 more group | 3×3, 3×4, 3×6, 3×7, 3×8 |
| 3 | Plus-One Squad | 5 groups + the rest | 6×6, 6×7, 7×7 |

Rules:
- **One chapter at a time.** Later chapters stay locked until the current one is done.
- **Training comes first.** A chapter's missions open only after its lesson, which ends with a practice problem the child must solve.
- **"Review the power"** replays the lesson at any point during the chapter.
- **A chapter is done once every hero in it has been powered at least once.** That's permanent: a later miss lowers a hero's rank but never un-finishes a chapter. (Early versions required every hero to be powered at the same moment, which made finishing a moving target.)

### Missions

A mission is 12 questions, about 6 minutes:

- **8 facts from the current chapter**, least mastered and most overdue first.
- **Up to 2 review facts** from finished chapters, only when they're due. If none are due, the current chapter fills those slots.
- **2 warm-ups** from facts the child already knows (5s, 9s, 10s, 11s), for easy early wins.

Questions are shuffled, the same fact never appears twice in a row, and the order of factors is randomized (6 × 7 or 7 × 6).

**A correct answer** shows a short "POW!" with the hero's picture and moves on.

**A wrong answer never stops the mission:**
1. The Training Room redraws that fact using its strategy, as a dot grid with steps.
2. The child types the correct answer.
3. The fact comes back once more later in the same mission.
4. The hero drops one rank, and the fact is due again right away.

A collapsible strip under the question shows every hero in this mission: done (correct or missed, with the full equation), current, or coming up (with the equation but no answer), plus a colored label for each hero's team.

### Ranks and review timing

| Rank | How it's earned | Next review |
|---|---|---|
| Locked | Chapter not started | — |
| Recruit | Chapter training finished | Same day |
| Bronze (powered) | First correct answer | Next day |
| Silver | Another correct answer | 3 days |
| Gold | Correct **and under 3 seconds** | 1 week |
| Legend | Gold held over time | ~3 weeks |

Only a hero's first appearance in a mission changes its rank. No timer is ever shown; answer times are recorded quietly and only matter for Gold and Legend.

### Final battle

Once all three chapters are done, the final battle unlocks: a 12-question mission drawing from all 15 facts. It can be replayed, and the game counts wins.

## Screens

- **Home ("HQ")**, ordered as a story:
  1. **The threat:** the villain, and his 15-piece shield showing how many facts are left.
  2. **Your next move:** one card with one primary button (Start training, Start mission or Start final battle) and a "Review the power" link during a chapter.
  3. **How to win:** the loop above, with the current step highlighted. It stays on screen permanently.
  4. **The path to the villain:** chapter cards in order, each showing its heroes (bright = powered, faded = not yet, darkened = locked) and the same primary button.
- **Training lesson:** step-by-step dot grids, then a practice problem.
- **Mission** and **Training Room** (after a miss).
- **Debrief:** what changed for each hero, a "Chapter complete!" banner when one is finished, and "Come back tomorrow."
- **My heroes:** all 15 cards with rank and typical answer time.
- **Parent setup:** pictures and names (drag-and-drop, paste, or file upload), the place under attack, a progress table and a reset option.

## How the design changed

The game was built iteratively by playtesting with its one target user. Notable changes:

- **Home screen redesign.** The first home screen put the villain on the left, the teams on the right, and "Training Academy" and "My heroes" buttons at the bottom. Before any training, the main button was below the fold on a phone, and nothing explained that learning multiplication *is* how you win. The redesign orders the screen as a narrative (threat → next move → rules → path) with a single primary action.
- **From three open lessons to one chapter at a time.** Letting a child do all three lessons on day one spread practice thinly across 15 new facts. Chapters keep each new strategy in focus until it sticks.
- **Strip steps that actually activate.** An early "How to win" strip had a step ("Heroes power up") that never became active, because it was a result, not an action. It became a repeating two-step chapter loop plus the final battle.
- **Clearer strategy wording.** "Start with one group of 7: 7" read like a ratio to a parent tester. It became "1 × 7 = 7."
- **An 8s example for the Doublers.** The doubling lesson originally showed only a 4s example; it now also walks through 8 × 6 (double three times).
- **Visible locked heroes.** Locked heroes started as blank cards, then greyscale. Neither was recognizable, so they now keep their colors under a darkening overlay.
- **Streak as information, not a button.** A pill-shaped streak counter looked clickable but did nothing; it's now plain text with a flame icon.

## Ideas not built yet

- **Speed Trials:** race your own best time ("ghost") on facts at Silver or above.
- **A dedicated boss screen** for the final battle.
- **Sidekick mode:** a parent plays alongside with harder problems (two-digit × one-digit).
- **AI-generated story problems** in the game's theme, checked by an evaluation suite for math correctness and reading level.

## Technical notes

- **One file.** The whole game is `index.html`: HTML, CSS and vanilla JavaScript, with no build step or dependencies.
- **Storage.** Progress, names and pictures save in the browser (`localStorage`). When the page runs as a Claude artifact, it uses that platform's per-user storage instead, which syncs across devices and lets the page owner share a hero setup with invited viewers. Uploaded pictures are shrunk to 320 px JPEGs before saving.
- **Accessibility.** Real buttons and labels throughout, visible focus outlines, keyboard input for answers (digits, Backspace, Enter), and states that never rely on color alone (correct/missed also use icons and words).
