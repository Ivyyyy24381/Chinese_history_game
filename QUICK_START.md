# Quick Start Guide - Refactored React History Game

## What Changed?

The monolithic `index.jsx` (916 lines) has been refactored into 8 focused React components.

## Key Files

| File | Purpose |
|------|---------|
| `/src/App.jsx` | Main orchestrator component |
| `/src/components/*.jsx` | 7 UI components |
| `/src/styles/game.css` | Global styles |
| `/src/data/dufu/timeline.json` | Game data structure |
| `/assets/maps/tang_dynasty.png` | Map background |

## File Structure

```
src/
├── App.jsx
├── components/
│   ├── CharacterSelect.jsx
│   ├── ScoreBar.jsx
│   ├── GameMap.jsx
│   ├── Timeline.jsx
│   ├── DialogueBox.jsx ← NEW (Visual novel style)
│   ├── EventPanel.jsx
│   └── QuizPanel.jsx
├── styles/game.css
├── data/dufu/
│   ├── timeline.json
│   ├── scenes/ (6 JSON files with dialogues)
│   └── quizzes/ (6 JSON files with questions)
└── main.jsx
```

## How to Run

```bash
npm install
npm run dev
```

## Component Overview

### App.jsx
- Global state manager
- Handles screen transitions
- Loads timeline data

### CharacterSelect.jsx
- Character selection UI
- Shows locked/unlocked characters

### ScoreBar.jsx
- Progress indicator at top
- Shows current stage progress

### GameMap.jsx
- Tang Dynasty map background
- Clickable location markers

### Timeline.jsx
- 6-stage timeline navigation
- Progress checkmarks

### DialogueBox.jsx (NEW)
- Visual novel style dialogue
- Character portraits
- Click-to-continue mechanic
- Narrator support

### EventPanel.jsx
- Narrative and poem display
- Triggers Dialogues and Quizzes

### QuizPanel.jsx
- Multiple choice questions
- Fill-in-the-blank questions
- Score calculation

## Game Flow

1. Select character (currently only "杜甫" enabled)
2. Game loads with map, timeline, and score bar
3. Click locations on map or timeline buttons
4. Click "探索此时期" to view event details
5. Choose to view dialogues or start quiz
6. Dialogues display as visual novel (click to continue)
7. Quiz evaluates answers (50%+ = pass)
8. Progress updates and you can continue

## Data Files

### timeline.json Structure
```json
{
  "character": { /* Du Fu info */ },
  "stages": [
    {
      "id": "01_youth",
      "period": "少年游历",
      "location": { "mapX": 63.5, "mapY": 53 },
      "color": "#27AE60",
      "sceneFile": "01_youth.json",
      "quizFile": "01_youth.json"
    }
  ]
}
```

### Scene JSON Structure
```json
{
  "narrative": "Historical text...",
  "poem": { "title": "望岳", "content": "..." },
  "dialogues": [
    {
      "speaker": "dufu",
      "speakerName": "杜甫",
      "portrait": "/assets/characters/dufu/portrait.png",
      "position": "left",
      "text": "Dialog text..."
    }
  ]
}
```

### Quiz JSON Structure
```json
{
  "quizzes": [
    {
      "type": "choice",
      "question": "Question?",
      "options": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "Explanation..."
    }
  ]
}
```

## New Features

1. **Visual Novel Dialogue Box**
   - Character portraits (left/right)
   - Click or space to continue
   - Progress bar indicator

2. **Dynamic Data Loading**
   - Scene and quiz files loaded on-demand
   - Efficient memory usage

3. **Improved Organization**
   - Each component has single responsibility
   - Easy to find and modify features

## Styling

- Inline styles (no CSS modules)
- Global styles in `game.css`
- All colors defined in `timeline.json`

## Adding Content

### Add a New Stage
1. Add to `timeline.json` stages array
2. Create `scenes/{id}.json`
3. Create `quizzes/{id}.json`
4. Update mapX/mapY coordinates (0-100%)
5. Set unique color

### Add Character Portrait
1. Place image in `/assets/characters/{characterId}/`
2. Reference in scene JSON dialogue object

### Modify Quiz
1. Edit `/src/data/dufu/quizzes/{id}.json`
2. Add/remove questions in quizzes array

## Chinese Text

All Chinese characters work properly:
- Direct text in JSX: `<div>杜甫</div>`
- Unicode escapes: `"\u675c\u752b"` (if needed)
- JSON files: Direct UTF-8 characters

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Dialogues not showing | Check scene JSON dialogue array structure |
| Map markers misaligned | Verify mapX/mapY are percentages (0-100) |
| Quiz answers not correct | Check answer text matches exactly (case-sensitive) |
| Images not loading | Verify asset paths match in JSON files |

## Component Communication

```
App (state)
├─ CharacterSelect ─→ onSelect(character)
├─ ScoreBar ← character, progress, totalStages
├─ GameMap ← stages, currentStage
│         ─→ onLocationClick(stageId)
├─ Timeline ← stages, currentIndex, progress
│           ─→ onSelect(index)
├─ EventPanel ← stage
│              ─→ onStartQuiz(), onClose()
│   └─ DialogueBox ← dialogues
│                  ─→ onComplete()
└─ QuizPanel ← stage
              ─→ onComplete(passed), onClose()
```

## Performance Tips

- Components re-render only when needed
- JSON files loaded dynamically
- Browser caches images
- No memory leaks in event handlers

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ required
- Flexbox/Grid CSS
- Dynamic imports

## Next Steps

1. Test all stages and quizzes
2. Verify Chinese text displays correctly
3. Check map marker positioning
4. Test dialogue display with portraits
5. Verify progress tracking works

For detailed documentation, see `REFACTORING_GUIDE.md`.
