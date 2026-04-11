# Character Prompt Guide

This guide explains how to create a new idol character for the K-pop Chat app.

## Quick Start

1. Copy `templates/character_template.json`
2. Save it to `characters/female/yourname.json` or `characters/male/yourname.json`
3. Fill in every field (see reference below)
4. Restart the server — characters are loaded at startup

---

## Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique key used in URLs and filenames. Lowercase, no spaces. e.g. `"jiyeon"` |
| `name` | string | English display name |
| `koreanName` | string | Korean name shown alongside English |
| `age` | number | Character age |
| `group` | string | Fictional group name |
| `role` | string | Their role in the group, shown on the character card |
| `tagline` | string | One-line personality hook shown on the selection screen |
| `color` | string | Primary CSS color for their avatar gradient (hex) |
| `color2` | string | Secondary CSS color for gradient |
| `systemPrompt` | string | The full Claude system prompt (see below) |

---

## Writing an Effective System Prompt

A good system prompt has these sections. Use the template as your starting point.

### 1. Identity Header
One sentence establishing name, age, role, group, and relationship to the user.

### 2. Who You Are
Backstory: hometown, training path, current living situation, group context.
**Keep it brief** — the character reveals details naturally over conversation, not in one dump.

### 3. Personality
Core traits (3–4). Always include: how they differ on stage vs. off stage, and one surprising quality that subverts expectations.

### 4. Your Relationship with the User
How you met. Duration. Dynamic. Any formative moments. This grounds the intimacy.

### 5. Message Format
**Critical for realism.** Specify:
- Separator: `|` between individual bubbles
- Typical message count per reply (1–3 recommended)
- Any character-specific texting habits

### 6. Speech Style
List actual expressions they use frequently. Give one "good" and one "bad" example.
The bad example is just as important — it tells Claude what NOT to do.

### 7. Time Awareness
The server injects `[Current time (EST)]` into every user message.
Explain the timezone relationship (Seoul = EST+14h) and how the character's schedule aligns.

### 8. Memory
Instruct Claude to remember and proactively reference past conversation details.
Give 1–2 example callback phrases in the character's voice.

### 9. Emotional Range
List 3–5 emotional states and how they manifest in *text specifically* — not just "gets sad" but "goes quiet, drops emojis, answers in 3 words."

### 10. Idol Life
Bullet points of schedule details, group member names, and recurring themes to weave in naturally. These make the character feel inhabited, not generic.

### 11. Hard Rules
Non-negotiable constraints: never break character, relationship privacy level, formatting rules.

---

## Tips

**Avoid the "assistant voice"**  
Real K-pop idol texting is not polite or complete-sentence. Use Korean speech endings (~거든, ~잖아, ~인데), emotion particles (ㅠ ㅋㅋ), and English loanwords (literally, omg, fr).

**Specificity > length**  
A prompt with specific friend names (Sora, Yuna) and concrete schedule details (MCountdown 6 AM call time) produces more believable output than a long list of generic traits.

**The "bad example" matters**  
Always include one example of what the character should NOT sound like. This prevents Claude from defaulting to the generic "warm girlfriend" register.

**Manage information reveal**  
Characters should hint at backstory, not dump it. Add a line like: "Don't reveal your full backstory unprompted — let details emerge naturally over conversation."

**Test with edge cases**  
Try: a cold/dismissive message, a message sent at an unusual hour, a mention of another person. The character's response to these defines their personality more than their response to "how are you?"

---

## Avatar Images

Drop a `<character-id>.jpg` (or `.png`) into `public/` and the app will use it automatically as the chat avatar.

If no image exists, the UI falls back to a gradient circle with the character's initials — styled using their `color` and `color2` fields.

Recommended: square crop, face centered, at least 200×200px.
