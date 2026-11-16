# Cartoon kaise banti hai — 2D animation pipeline (Hinglish)

Yeh app wahi workflow follow karta hai jo real 2D studios (Tom & Jerry, Chhota Bheem type) me hota hai.
Neechen har step, aur us step ka code kaunsi file me hai:

| # | Step (studio me kya hota hai) | Is app me kahan |
|---|---|---|
| 1 | **Script writing** — kahani, dialogues, mood | `js/writer-free.js` (aapka text → script JSON) + `js/script-format.js` (checking) |
| 2 | **Storyboard / Layout** — kaunsi scene, kaun kahan, camera | `js/scenes.js` (backgrounds) + `js/renderer.js` (positions, camera, iris fade) |
| 3 | **Character design + Rig** — look fix, body parts | `js/characters.js` (look generator + drawing) |
| 4 | **Animation / Acting** — pose, walk cycle, squash-stretch, blink, lip-flap | `js/acting.js` (mood + action → pose) |
| 5 | **Sound design** — music, SFX, cartoon voice | `js/sound.js` (sab kuch Web Audio se generate hota hai) |
| 6 | **Edit + Export** — video file (MP4/WebM) | `js/exporter.js` (MediaRecorder) + `js/main.js` (buttons) |

## Script format (sabse important)

```
Scene: jungle
Narrator: Deep in the jungle, Tom is chasing Jerry again.
Tom: Come back here, you little mouse! (angry, run)
Jerry: Catch me if you can! (smug, run)
Narrator: A coconut falls on Tom's head. CRASH!
Tom: Oww! That was not funny! (angry)
Jerry: Ha ha ha! (happy, dance)
```

- `Scene:` → background: `jungle`, `park`, `room`, `night`, `beach`, `street`, `school`
- `Naam: dialogue` → character bolta hai
- `(...)` me acting hint: mood (`angry`, `scared`, `happy`, `excited`, `sad`, `confused`, `surprised`, `smug`, `sleepy`, `dizzy`, `love`, `determined`)
  aur action (`run`, `jump`, `fall`, `dance`, `sneak`, `cower`, `pounce`, `panic`, `clap`, `wave`, `point`, `think`, `shrug`, `spin`, `walk`)
- prop bhi likh sakte ho: `cake`, `pie`, `hammer`, `bomb`, `bone`, `banana`, `ball`, `bucket`, `flower`, `fish`, `shoe`, `piano`
- `Narrator:` line me action words likho — app khud sound effect (CRASH/BOING/SLIDE) laga deta hai.

## Tom & Jerry wala "feel" kahan se aata hai

1. **Squash & stretch** — jump par body lambi, landing par dabi hui (`acting.js` me `sq`, `dy`).
2. **Anticipation + timing** — pose thoda rukta hai, phir action; ek frame ka pause = comedy.
3. **Reaction shot** — ek character maar khata hai, doosra hansne lagta hai (`renderer.js` me `REACT`).
4. **Comic sound words** — CRASH!, BONK!, BOING! screen par likhe aate hain.
5. **Cartoon mumble voice** — har character ki apni awaaz (pitch uske naam se aata hai), "bloopers" style gibberish.
6. **Iris wipe + shake** — scene change par gol iris close/open, dhamake par camera shake.

## Episode videos (terminal render)

`episodes/` folder me do ready-made original episodes hain (text + MP4):

| Episode | File | Length |
|---|---|---|
| Chiku vs Bantu (jungle, monkey vs bear) | `episodes/chiku-vs-bantu.mp4` | 71 sec |
| Bruno vs Sheru (street, dog vs cat) | `episodes/bruno-vs-sheru.mp4` | 54 sec |

Dobara render karna ho to:

```bash
cd tools
npm install                      # ek baar: @napi-rs/canvas
node render-video.js --story ../episodes/chiku-vs-bantu.txt --out ../episodes/chiku-vs-bantu.mp4
```

Yeh renderer wahi `js/` files use karta hai (same animation engine), frames ko `ffmpeg` se MP4 me daalta hai
aur saath me khud ka banaya audio (music + SFX + cartoon awaaz) mix karta hai. Text badal kar nayi episode ban jayegi.

## Animal characters (Tom & Jerry style)

Script me naam ke saath jaanwar likho, character usi species me ban jayega:
`Chiku the monkey`, `Bantu the bear`, `Sheru the cat`, `Jerry the mouse`, `Bruno the dog`, `Bunty the rabbit`, `Raja the lion` — ya naam hi kaafi hai (Chiku = monkey, Bantu = bear, Sheru = cat, Bruno = dog).
`person` default hai. Species list: `person, monkey, bear, cat, mouse, dog, rabbit, lion` (`js/characters.js`).

## Export

- **Save video (MP4)** → real-time record (sound ke saath). Chrome/Safari MP4 dete hain, baaki browsers WebM.
- **Fast recording** → jaldi render, lekin **bina sound**.
- Phone par download ke baad **Share** button se WhatsApp/Gallery me bhej sakte ho.

## Apna art add karna

- Naya character style: `js/characters.js` ke `head()` / `torso()` / `draw()` me drawing badlo.
- Naya background: `js/scenes.js` me `draw.myPlace = (c, t) => {...}` add karo aur naam `Scene:` me use karo.
- Naya sound: `js/sound.js` ke `SFX` object me ek function add karo.
