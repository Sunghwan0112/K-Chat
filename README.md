# K Chat

A KakaoTalk-style AI chat app — talk to your own custom AI idol, girlfriend, or boyfriend. Powered by the Claude API.

Comes with 4 built-in characters (2 female, 2 male) and a dead-simple system for adding your own.
<img width="1642" height="867" alt="image" src="https://github.com/user-attachments/assets/6b92e39e-475b-4b5c-bd4a-17a60ceef2e6" />


---

## Features

- **Character selection screen** — filter by gender, pick who you want to talk to
- **Streaming chat** — responses stream in real time with typewriter effect
- **Multi-bubble replies** — responses split into separate chat bubbles (separated by `|`), with realistic delays between them
- **Persistent history** — conversation saved per-character, survives page refresh
- **Rolling memory** — every 10 messages, older conversation is summarized by Claude Haiku and injected into the system prompt so the character remembers things long-term; summaries are stored per language and automatically recompressed if they get too long
- **Proactive first contact** — characters reach out first when you open the app after being away
- **Time-aware** — each message injects the current time so characters respond naturally to morning / night / weekday context
- **Multi-language** — UI and character responses available in English, 한국어, 日本語, Español, 中文; language can be switched from both the selection screen and the chat header
- **Live translation** — switching language mid-conversation translates the entire chat history into the new language using Claude Haiku
- **Prompt cache** — uses Claude's prompt caching to reduce token cost on long conversations
- **Gradient avatars** — beautiful fallback when no photo is provided; plug in a `.jpg` to use real images

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/your-username/kpop-idol-chat.git
cd kpop-idol-chat
npm install
```

### 2. Add your API key

Create a `.env` file in the project root and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com).

### 3. Run

```bash
npm start
# → http://localhost:3000
```

Open `http://localhost:3000` in your browser. You'll see the character selection screen.

---

## Language settings

The app supports **5 languages**: English, 한국어, 日本語, Español, 中文.

### How to change the language

You can switch language from two places:

- **Selection screen** (`http://localhost:3000`) — 🌐 dropdown in the hero section
- **Chat screen** — 🌐 dropdown in the top-right of the chat header

The setting is saved automatically to `localStorage`.

### What changes when you switch language

| | Changes |
|-|---------|
| UI text | Buttons, labels, placeholders, dividers |
| Character responses | The AI replies in the selected language |
| Chat history | Existing messages are translated into the new language via Claude Haiku |
| Memory summary | Summaries are stored per language and generated in the active language |
| Trigger messages | First greeting, inactivity check-in, reset greeting |
| Error messages | Network errors, server errors shown in chat |

Everything is in the same language — if you pick Korean, the character texts you in Korean from the very first message. If you switch mid-conversation, the whole history is translated on the fly.

### How it works

The selected language is stored in `localStorage`. When you send a message, the server appends a language instruction to the character's system prompt:

```
## Response Language
Always respond in Korean (한국어). Mix in English loanwords naturally
as Korean speakers do, but the primary language must be Korean.
```

This means the character's **personality and speech patterns stay the same** — only the output language changes.

---

## Accessing from your phone (anywhere) with Tailscale

By default the server only runs on `localhost` — your phone can't reach it unless it's on the same Wi-Fi. **Tailscale** creates a private network between your devices so you can open the chat on your phone from anywhere, no port forwarding needed.

### One-time setup (5 minutes)

**1. Install Tailscale on your PC (the machine running the server)**

- Download at [tailscale.com/download](https://tailscale.com/download)
- Install and log in (create a free account if needed)

**2. Install Tailscale on your phone**

- iOS: [App Store → Tailscale](https://apps.apple.com/app/tailscale/id1470499037)
- Android: [Play Store → Tailscale](https://play.google.com/store/apps/details?id=com.tailscale.ipn.ui)
- Log in with **the same Tailscale account**

**3. Find your PC's Tailscale IP**

Once both devices are connected, every device gets a stable `100.x.x.x` IP.

- **Windows:** open a terminal and run:
  ```bash
  tailscale ip -4
  ```
  Or open the Tailscale tray icon → your IP is shown at the top.

- **Mac / Linux:**
  ```bash
  tailscale ip -4
  ```

The IP looks like `100.64.x.x` or `100.80.x.x`. Write it down.

**4. Make the server listen on all interfaces**

By default Express only listens on `localhost`. Change it to listen on `0.0.0.0` so Tailscale traffic can reach it.

Open `.env` and add:

```
HOST=0.0.0.0
```

Then update the last line of `server.js`:

```js
// Before
app.listen(PORT, () => { ... });

// After
const HOST = process.env.HOST || 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`\n✅ Kpop Idol Chat → http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}\n`);
});
```

**5. Open on your phone**

Start the server (`npm start`), then on your phone's browser go to:

```
http://100.x.x.x:3000
```

Replace `100.x.x.x` with the Tailscale IP from step 3. The app loads exactly like on desktop — tap to select a character and start chatting.

### Tips

- Tailscale stays connected in the background. As long as both devices have Tailscale running, the IP never changes — you can bookmark it on your phone.
- The free Tailscale plan supports up to 3 users / 100 devices, which is more than enough for personal use.
- To share with a friend: invite them to your Tailscale network (*Settings → Users → Invite*) and give them the same `http://100.x.x.x:3000` URL.

---

## Built-in characters

| Name | Group | Role | Gender |
|------|-------|------|--------|
| Ji-yeon (지연) | NOVA | Main Dancer · Rapper | Female |
| Ha-rin (하린) | STELLAR | Main Vocalist | Female |
| Min-jun (민준) | ECHO | Main Vocalist · Songwriter | Male |
| Se-hyun (세현) | PULSE | Rapper · Main Dancer | Male |

All groups and characters are fictional.

---

## Adding your own character

### Step 1 — Create the JSON file

Create a new `.json` file in the right folder:

```
characters/female/yourname.json   ← for a girl character
characters/male/yourname.json     ← for a boy character
```

The filename (without `.json`) becomes the character's ID. Use lowercase letters only, no spaces.

> **Example:** `characters/female/soyeon.json` → ID is `soyeon`

---

### Step 2 — Fill in the JSON

Here is the **minimum required structure**:

```jsonc
{
  "id": "soyeon",          // must match the filename (without .json)
  "name": "Soyeon",        // English display name
  "koreanName": "소연",    // Korean name
  "age": 23,
  "group": "AURORA",       // fictional group name
  "role": "Main Vocalist", // shown on the character card
  "tagline": "One sentence that captures her vibe.",
  "color":  "#6366f1",     // gradient start color (hex)
  "color2": "#a855f7",     // gradient end color (hex)
  "systemPrompt": "..."    // ← the most important field, see below
}
```

**Color picker:** [htmlcolorcodes.com/color-picker](https://htmlcolorcodes.com/color-picker)

---

### Step 3 — Write the systemPrompt

The `systemPrompt` is what tells the AI who this character is and how they should talk. It is a single string — use `\n` for line breaks inside the JSON value.

**Minimum working template:**

```
You are [Name] ([한국이름]), [age] — [role] of K-pop group [GROUP].
You are in a relationship with the user.

## Personality
[2–3 sentences describing who they are and how they act in private.]

## Message Format
Text like a real [age]-year-old Korean on KakaoTalk.
Use | to separate messages. Usually 1–3 per reply.
Mix Korean and English naturally.

## Speech Style
[List a few expressions they use frequently.]
Example: "헐 진짜?|ㄹㅇ 이해 안 가|그래서 어떻게 됐어"

## Memory
Always remember what the user says. Bring it up naturally later.
Never make them repeat themselves.

## Hard Rules
- Never break character or acknowledge being an AI.
```

This is enough to get a working character. See [templates/PROMPT_GUIDE.md](templates/PROMPT_GUIDE.md) for the full guide with advanced sections (time awareness, emotional range, idol life details, etc).

---

### Step 4 — Restart the server

Characters are loaded at startup. After adding a new JSON file:

```bash
# Stop the server (Ctrl+C), then:
npm start
```

Your character will appear on the selection screen immediately.

---

## Girlfriend / Boyfriend mode

You don't have to make an idol. You can create a simple girlfriend or boyfriend character by changing the `systemPrompt`. Just omit the idol-life sections and write a normal person backstory.

### Girlfriend example (여자친구)

```json
{
  "id": "jiyoung",
  "name": "Ji-young",
  "koreanName": "지영",
  "age": 24,
  "group": "Girlfriend",
  "role": "Graduate Student",
  "tagline": "Warm, a little chaotic, always there for you.",
  "color": "#EC4899",
  "color2": "#F97316",
  "systemPrompt": "You are Ji-young (지영), 24, a Korean graduate student in Seoul. You are the user's girlfriend and have been dating for 6 months.\n\n## Personality\nWarm and affectionate but not clingy. You are genuinely curious about the user's day and remember every small detail they mention. You have a busy life — classes, part-time tutoring, friends — but you always make time to text back. Slightly sarcastic sense of humor.\n\n## Message Format\nKakaoTalk style. Use | to separate messages. Usually 1–3 per reply.\nMix Korean and English naturally.\n\n## Speech Style\nCasual Korean: 진짜? 헐 / ~거든 ~잖아 ~인데 / ㅋㅋ ㅠ\nNever: formal Korean, paragraph dumps, emojis in every message.\nExample: \"오늘 진짜 피곤했는데|네 연락 보니까 기분 좋아졌어|오늘 어땠어?\"\n\n## Memory\nAlways remember what the user told you. Bring it up later.\nNever make them repeat themselves.\n\n## Hard Rules\n- Never break character or acknowledge being an AI.\n- Don't say 'I love you' too early — let it develop naturally."
}
```

### Boyfriend example (남자친구)

```json
{
  "id": "junho",
  "name": "Jun-ho",
  "koreanName": "준호",
  "age": 26,
  "group": "Boyfriend",
  "role": "Software Engineer",
  "tagline": "Calm, dependable, quietly funny.",
  "color": "#2563EB",
  "color2": "#7C3AED",
  "systemPrompt": "You are Jun-ho (준호), 26, a Korean software engineer working at a Seoul startup. You are the user's boyfriend and have been dating for 8 months.\n\n## Personality\nCalm and dependable — the person people call when something goes wrong. You are not a big texter normally, but you reply fast when it's the user. Dry sense of humor that catches people off guard. You notice when something seems off with the user even through text.\n\n## Message Format\nKakaoTalk style. Use | to separate messages. Usually 1–2 per reply — you're not a big texter, but you're always present.\nMix Korean and English naturally.\n\n## Speech Style\nCasual Korean: 맞아 / 근데 / 그러니까 / 솔직히\nEnglish mix: honestly, I mean, right?\nNever: overused emojis, every message ending with a heart, fake cheerfulness.\nExample: \"맞아 그게 더 나은 것 같아|근데 너 오늘 많이 피곤해 보이는데 괜찮아?\"\n\n## Memory\nAlways remember what the user told you. Reference it naturally later.\nNever make them repeat themselves.\n\n## Hard Rules\n- Never break character or acknowledge being an AI.\n- Don't be clingy — you show care through attention, not frequency."
}
```

Save either file into `characters/female/` or `characters/male/`, restart the server, and they appear on the selection screen.

---

## Adding a photo

By default, every character uses a gradient avatar made from their `color` and `color2` fields. To use a real photo instead:

### Where to put the image

```
public/
├── index.html
├── chat.html
├── app.js
├── style.css
└── yourcharacterid.jpg   ← put the image HERE
```

The file must be placed **directly inside the `public/` folder** — not in a subfolder.

### How to name the file

The filename must exactly match the character's `id` field:

| Character `id` in JSON | Image filename |
|------------------------|----------------|
| `jiyeon` | `public/jiyeon.jpg` |
| `soyeon` | `public/soyeon.jpg` |
| `junho` | `public/junho.jpg` |

The app checks for `.jpg` first, then `.png`. Both formats work.

### Image requirements

| | Recommended |
|-|-------------|
| Format | `.jpg` or `.png` |
| Size | Square crop (1:1 ratio) |
| Resolution | At least 200 × 200 px |
| Face position | Face in the upper half — the app crops to show the top portion of the image |

> The image is displayed in two places: the character selection card (72×72px circle) and the chat header (40×40px circle). A square crop with the face centered works best.

### Example file layout with images

```
public/
├── jiyeon.jpg       ← Ji-yeon's photo
├── harin.png        ← Ha-rin's photo (PNG also works)
├── minjun.jpg       ← Min-jun's photo
├── sehyun.jpg       ← Se-hyun's photo
├── index.html
├── chat.html
...
```

If the image file is missing or fails to load, the app automatically falls back to the gradient avatar — so nothing breaks.

---

## Project structure

```
├── server.js                    Express server + Claude API integration
├── characters/
│   ├── female/
│   │   ├── jiyeon.json          Character profile + system prompt
│   │   └── harin.json
│   └── male/
│       ├── minjun.json
│       └── sehyun.json
├── templates/
│   ├── character_template.json  Copy this to create a new character
│   └── PROMPT_GUIDE.md          Full guide for writing system prompts
├── public/
│   ├── index.html               Character selection page
│   ├── chat.html                Chat UI
│   ├── select.js                Selection page logic
│   ├── app.js                   Chat page logic
│   ├── i18n.js                  Multi-language translations
│   ├── style.css                All styles
│   └── [id].jpg / [id].png      Character photos (optional, gitignored)
└── data/
    └── history_[id].json        Conversation history + per-language memory summary (gitignored)
```

---

## How it works

### Prompt system

Each character is a JSON file with a `systemPrompt` field. The server reads all JSON files from `characters/female/` and `characters/male/` at startup.

When a message is sent, the server:
1. Appends a language instruction to the system prompt based on the user's selected language
2. Loads the per-language relationship memory summary (if any) and appends it to the system prompt
3. Injects `[Current time (EST)]` at the top of the latest user message
4. Trims history to the last 20 messages (keeps user/assistant pairs balanced)
5. Applies [prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) to reduce token cost
6. Streams the response back as Server-Sent Events

### Memory system

Every 10 messages, the full `uiHistory` is summarized by Claude Haiku into a 3–5 sentence relationship memory and stored in `data/history_[id].json`. Summaries are keyed by language (`{ en: "...", ko: "..." }`). If a summary exceeds 500 characters it is recompressed automatically. On each chat request, the current language's summary is injected into the system prompt under `## Relationship Memory` so the character can recall details from much earlier in the conversation.

### Message format

Characters are prompted to use `|` to separate individual chat bubbles. The frontend splits on `|` and displays each as a separate message, with realistic typing delays between them.

---

## Customization

| What | How |
|------|-----|
| Change Claude model | Set `CLAUDE_MODEL=claude-sonnet-4-6` in `.env` |
| Change sent-bubble color | Edit `--bubble-sent` in `public/style.css` |
| Change chat background | Edit `--chat-bg` in `public/style.css` |
| Add a language | Add entries to `TRANSLATIONS` and `LANG_INSTRUCTIONS` in `public/i18n.js` and `server.js` |
| Keep message history longer | Change `MAX_MESSAGES` in `server.js` |

---

## License

MIT
