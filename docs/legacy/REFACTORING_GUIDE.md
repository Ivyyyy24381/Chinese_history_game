# Chinese History Game - React Refactoring Guide

## Overview

The monolithic `index.jsx` has been successfully refactored into a modular, component-based React application with the following benefits:

- **Modularity**: Each UI element is its own reusable component
- **Maintainability**: Clear separation of concerns
- **Scalability**: Easy to add new characters, stages, and content
- **Data-Driven**: Content loaded from JSON files, decoupled from UI logic
- **Visual Novel Experience**: New DialogueBox component for immersive character interactions

## Directory Structure

```
src/
├── App.jsx                          # Main orchestrator
├── components/
│   ├── CharacterSelect.jsx         # Character selection screen
│   ├── ScoreBar.jsx                # Progress bar at top
│   ├── GameMap.jsx                 # Interactive Tang Dynasty map
│   ├── Timeline.jsx                # Stage timeline navigation
│   ├── DialogueBox.jsx             # Visual novel dialogue (NEW)
│   ├── EventPanel.jsx              # Event/narrative display
│   └── QuizPanel.jsx               # Quiz interface
├── styles/
│   └── game.css                    # Global styles & animations
├── data/
│   └── dufu/
│       ├── timeline.json           # Game data structure
│       ├── scenes/                 # Scene data with dialogues
│       └── quizzes/                # Quiz questions & answers
└── main.jsx                        # Entry point

assets/
├── maps/
│   └── tang_dynasty.png            # Map background image
└── characters/
    └── dufu/
        └── portrait.png            # Character portrait

```

## Component Overview

### App.jsx
**Purpose**: Main orchestrator managing game state and screen transitions

**State Management**:
- `screen`: 'select' or 'game'
- `character`: Selected character object
- `timelineData`: Timeline/stages data loaded from JSON
- `currentIndex`: Currently selected stage
- `progress`: Number of completed stages
- `showEvent`: Event panel visibility
- `showQuiz`: Quiz panel visibility

**Responsibilities**:
- Load timeline.json for selected character
- Manage screen transitions
- Handle location clicks and stage selection
- Track quiz completion and progress

### CharacterSelect.jsx
**Purpose**: Character selection screen with visual cards

**Features**:
- Displays available characters with:
  - Avatar emoji
  - Name (Chinese characters)
  - Title and years
  - Description
- Locked character overlay
- Selection animation feedback

**Props**:
- `characters`: Array of character objects
- `onSelect`: Callback when character is selected

### ScoreBar.jsx
**Purpose**: Top progress indicator

**Features**:
- Character avatar and name
- Character title badge
- Progress counter (X / total stages)
- Visual progress bar with character color

**Props**:
- `character`: Character object with color
- `progress`: Number of completed stages
- `totalStages`: Total number of stages

### GameMap.jsx
**Purpose**: Interactive Tang Dynasty map with location markers

**Features**:
- Background image: `/assets/maps/tang_dynasty.png`
- Clickable location markers positioned with percentages (mapX, mapY)
- Interactive hover effects and scaling
- Color-coded by stage

**Props**:
- `currentStage`: Currently selected stage object
- `stages`: Array of all stages
- `onLocationClick`: Callback with stage ID

**Important**: Map coordinates use percentage-based positioning (0-100) relative to image dimensions.

### Timeline.jsx
**Purpose**: Horizontal timeline navigation

**Features**:
- 6 stage buttons (current journey has 6 stages)
- Checkmarks for completed stages
- Year and period labels below buttons
- Click to navigate to any stage
- Color-coded by stage

**Props**:
- `stages`: Array of stage objects
- `currentIndex`: Currently selected stage index
- `onSelect`: Callback with stage index
- `progress`: Number of completed stages

### DialogueBox.jsx (NEW)
**Purpose**: Visual novel style dialogue display

**Features**:
- Full-width bottom panel overlay
- Character portrait (left/right positioning based on data)
- Speaker name display
- Narrator mode (centered text, no portrait)
- Click anywhere or press Space to continue
- Progress bar at bottom
- Smooth text animations
- Automatic completion callback

**Props**:
- `dialogues`: Array of dialogue objects with:
  - `speaker`: Character ID or "narrator"
  - `speakerName`: Display name
  - `portrait`: Image path (e.g., "/assets/characters/dufu/portrait.png")
  - `position`: "left", "right", or "center"
  - `text`: Dialogue content
- `onComplete`: Callback when all dialogues finish

**Data Structure**:
```json
{
  "speaker": "dufu",
  "speakerName": "杜甫",
  "portrait": "/assets/characters/dufu/portrait.png",
  "position": "left",
  "text": "Dialogue text here..."
}
```

### EventPanel.jsx
**Purpose**: Display stage narrative, poetry, and options

**Features**:
- Title display with stage color
- Poem section with title and multi-line content
- Narrative paragraph
- Two action buttons:
  - View dialogues (triggers DialogueBox)
  - Start quiz (triggers QuizPanel)
- Dynamically loads scene JSON files

**Props**:
- `stage`: Current stage object
- `onStartQuiz`: Callback to start quiz
- `onClose`: Callback to close panel

**Data Loaded From**: `/src/data/dufu/scenes/{id}.json`

### QuizPanel.jsx
**Purpose**: Interactive quiz interface

**Features**:
- Multiple question types:
  - Multiple choice (A, B, C, D)
  - Poem fill-in-the-blank
- Progress counter
- Answer feedback and explanations
- Result screen with score display
- Pass/fail logic (>= 50% = pass)
- Dynamically loads quiz JSON files

**Props**:
- `stage`: Current stage object
- `onComplete`: Callback with pass/fail result
- `onClose`: Callback to close panel

**Data Loaded From**: `/src/data/dufu/quizzes/{id}.json`

## Data Files

### timeline.json
Structure:
```json
{
  "character": {
    "id": "dufu",
    "name": "杜甫",
    "title": "诗圣",
    "years": "712–770",
    "dynasty": "唐",
    "description": "...",
    "portrait": "/assets/characters/dufu/portrait.png"
  },
  "stages": [
    {
      "id": "01_youth",
      "period": "少年游历",
      "year": "712–735",
      "yearStart": 712,
      "yearEnd": 735,
      "color": "#27AE60",
      "location": {
        "id": "luoyang",
        "name": "洛阳",
        "mapX": 63.5,
        "mapY": 53
      },
      "summary": "...",
      "sceneFile": "01_youth.json",
      "quizFile": "01_youth.json"
    }
  ]
}
```

**Key Points**:
- `mapX` and `mapY` are percentages (0-100) for positioning on the map
- `sceneFile` and `quizFile` reference JSON files in respective directories
- `color` is used throughout for stage styling

### scenes/{id}.json
Structure:
```json
{
  "id": "01_youth",
  "title": "少年壮游",
  "background": "/assets/scenes/01_youth/bg.png",
  "narrative": "Historical narrative text...",
  "poem": {
    "title": "望岳",
    "content": "First line\nSecond line\nThird line"
  },
  "dialogues": [
    {
      "speaker": "dufu",
      "speakerName": "杜甫",
      "portrait": "/assets/characters/dufu/portrait.png",
      "text": "Dialogue text",
      "position": "left"
    },
    {
      "speaker": "narrator",
      "speakerName": "",
      "portrait": "",
      "text": "Narrative text",
      "position": "center"
    }
  ]
}
```

### quizzes/{id}.json
Structure:
```json
{
  "quizzes": [
    {
      "type": "choice",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Explanation text"
    },
    {
      "type": "poem_fill",
      "question": "Complete: \"...____...\"",
      "answer": "Answer word",
      "explanation": "Explanation"
    }
  ]
}
```

## Styling Approach

- **Inline Styles**: All components use inline style objects
- **No CSS Modules**: Follows existing pattern
- **Global Styles**: Only in `styles/game.css` (fonts, scrollbars, animations)
- **Font**: "Noto Serif SC", "Songti SC", serif

**Color Scheme**:
- Each stage has its own color in `timeline.json`
- Character selection background: dark gradient
- Game background: `#F5F0E8` (off-white)
- Text colors: `#333` (dark), `#999` (gray), `#FFF` (white overlay)

## Key Features

### 1. Dynamic Content Loading
All scene and quiz content is loaded via dynamic imports:
```javascript
import(`../data/dufu/scenes/${stage.sceneFile}`)
```

### 2. Visual Novel Dialogue
DialogueBox provides an immersive dialogue experience with:
- Character portraits
- Speaker identification
- Click-to-continue mechanic
- Space bar support for advanced players

### 3. Progress Tracking
- App tracks quiz completion
- Progress updates ScoreBar
- Stages show completion checkmarks on Timeline

### 4. Map-Based Navigation
- Real Tang Dynasty map image as background
- Percentage-based location positioning
- Clickable location markers

## Adding New Content

### Adding a New Stage
1. Add stage object to `timeline.json` stages array
2. Create scene file: `src/data/dufu/scenes/{id}.json`
3. Create quiz file: `src/data/dufu/quizzes/{id}.json`
4. Update map coordinates (mapX, mapY as percentages)
5. Assign unique color to stage

### Adding Character Portraits to Dialogue
- Store portrait image in `/assets/characters/{characterId}/portrait.png`
- Reference in scene JSON: `"portrait": "/assets/characters/{characterId}/portrait.png"`

### Modifying Quiz Questions
- Edit `/src/data/dufu/quizzes/{id}.json`
- Add/remove questions from the quizzes array
- Pass/fail threshold can be adjusted in QuizPanel.jsx

## Chinese Text Handling

**Safe Methods**:
1. Unicode escapes in JSX: `"\u675c\u752b"` = 杜甫
2. Direct text in JSX: `<div>杜甫</div>`
3. JSON files: Direct UTF-8 Chinese characters

**Avoid**:
- Chinese characters in template literals with special quotes
- Non-unicode encoded characters

All Chinese quotes 「」are safe unicode characters and work properly.

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript support required
- CSS Grid/Flexbox support needed
- Import/async functionality required

## Performance Notes

- JSON files are loaded on-demand (only when stage is accessed)
- Component re-renders optimized with useState
- No unnecessary re-renders of heavy components
- Image files cached by browser

## Development Tips

1. **Debugging Dialogues**: Check the `dialogues` array structure in scene JSON
2. **Map Positioning**: Use browser developer tools to visualize percentages
3. **Quiz Logic**: Answers must match exactly (case-sensitive)
4. **Progress**: Reset by clearing browser localStorage if needed
5. **Styling**: Modify inline styles in component definitions

## Future Enhancements

Possible improvements to consider:
- Multiple character storylines (Li Bai, Su Shi)
- Save/load game progress
- Difficulty levels
- Achievements/badges
- Sound effects and music
- Animated transitions between screens
- Mobile responsiveness improvements
- Accessibility features (screen readers, keyboard navigation)

---

For questions or issues, refer to the component JSDoc comments or examine the data structure in the JSON files.
