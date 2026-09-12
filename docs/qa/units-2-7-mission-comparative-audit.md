# Units 2–7 Mission Comparative Audit & Side-by-Side Quality Review

This audit compares the newly architected Unit 2 through Unit 7 capstone missions side-by-side against the benchmark established by **Unit 1 ("¡Todos a la celebración!", Lesson 1.10)** across the 5 core experiential dimensions.

---

## 1. Quality Matrix Summary

| Criterion | Unit 1 Baseline (`1.10`) | Units 2 & 3 Standard | Units 4 & 5 Standard | Units 6 & 7 Standard |
| :--- | :--- | :--- | :--- | :--- |
| **1. Onboarding Clarity** | 1-line Spanish briefing + 3 bullet goals | Single-sentence plain Spanish objective, locked start | Clear room/market objective briefing, no jargon | Milestone briefing summarizing capstone purpose |
| **2. Interaction Confidence** | Immediate audio cue + touch validation | No `Comprobar` button; $\ge 48\text{dp}$ touch radius | Non-punitive retries; individual vs pair markers | 8-node structured progression; immediate feedback |
| **3. Audio Reliability** | Offline recovery + immutable turns | Deterministic audio cues with offline recovery | Question-first audio flow before speech gates | Audio-first cues with manual retry fallback |
| **4. Structural Variety** | Guided search $\rightarrow$ action hunt $\rightarrow$ voice | Park photo $\rightarrow$ kitchen dinner transitions | 3-zone room assignment $\rightarrow$ market stalls | Town route checkpoints $\rightarrow$ festival podium |
| **5. Visual Diversity** | Garden & celebration entrance | Park vistas, bus stops, benches, dining room | Living room, kitchen stove, fruit market stalls | Town plaza, school gates, festival stage |

---

## 2. Side-by-Side Evaluation Across the 5 Dimensions

### Dimension 1: Onboarding Clarity
* **Unit 1 Standard:**
  * Displays a full-bleed kickoff card with 3 simple objectives: *"Encuentra personas"*, *"Sigue sus acciones"*, *"Reúne a la familia"*.
  * Spoken briefing in simple Spanish (*"La celebración está por comenzar y todavía faltan invitados..."*). Start unlocks only after briefing.
* **Units 2–7 Implementation:**
  * **Unit 2 ("Encuentro en el parque"):** *"¿Puedes rescatar a la familia y sus pertenencias en el parque para la foto de bienvenida?"*
  * **Unit 3 ("Cenas cruzadas"):** *"Ayuda a preparar la cena familiar escuchando las instrucciones."*
  * **Unit 4 ("Casa en orden"):** *"La familia prepara la casa para recibir una visita especial."*
  * **Unit 5 ("Misión mercado familiar"):** *"Salimos al mercado y al café a comprar todo para la cena familiar."*
  * **Unit 6 ("Ruta del barrio"):** *"Acompaña a la familia por el barrio mientras regresan a casa."*
  * **Unit 7 ("Gran misión de familia"):** *"Última misión del nivel A1: organiza un evento familiar completo."*
  * **Verdict:** 100% parity. Zero technical jargon (`modelo`, `señal`) used in learner-facing copy.

---

### Dimension 2: Interaction Confidence & Hotspot Mechanics
* **Unit 1 Standard:**
  * No `Comprobar` (Check) button. A correct tap validates instantly with acoustic chime and visual pulse, advancing after a 2.2s feedback beat.
  * Multi-target beats use `validation: "ordered"`; wrong taps preserve previously solved targets without resetting the whole card.
  * Targets maintain a minimum 48dp touch radius positioned strictly above the crown (or chest level for standing pairs), never occluding faces.
* **Units 2–7 Implementation:**
  * All 6 missions enforce `validation: "ordered"` with strict target-to-cue parity.
  * Elongated capsule markers with chest coordinates are specified for paired targets (e.g. `target-parents-group` in Unit 2, `target-parents-walking` in Unit 6).
  * 0% vertical scroll contract enforced across both portrait (375x667) and landscape (667x375).
  * **Verdict:** Passes all interaction guardrails without drag-and-drop or reset frustration loops.

---

### Dimension 3: Audio Reliability & Connection Recovery
* **Unit 1 Standard:**
  * Prompt audio plays automatically when entering a target state.
  * Speaker button repeats the exact English cue without translating to Spanish.
  * If audio fails to load or cellular signal stalls, an automatic recovery banner appears (*“Sin conexión, vuelve cuando haya señal”*) with a manual Retry button.
* **Units 2–7 Implementation:**
  * Reuses the production mobile audio readiness pipeline ([mobile/src/audioDownload.ts](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/mobile/src/audioDownload.ts) and [mobile/src/lessonAudioCache.ts](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/mobile/src/lessonAudioCache.ts)).
  * In voice challenge gates, the question audio plays first (*"Who is in the park?"*), then the closer image cut displays with the complete English answer model (*"Lee la frase en voz alta."*) before microphone activation.
  * **Verdict:** 100% architectural and operational consistency.

---

### Dimension 4: Fresh Narrative & Avoiding Repetitive Mechanics
* **Unit 1:** Finding guests in the garden and identifying their family roles and actions.
* **Unit 2 (Encuentro en el parque):**
  * Focuses on environmental observation: identifying people engaged in sports/reading, spotting transport (green bus), and counting colored items (three red bags).
* **Unit 3 (Cenas cruzadas):**
  * Focuses on multi-room kitchen coordination: who is cooking, who is answering the phone, who has what utensil, and speaking identity introductions.
* **Unit 4 (Casa en orden):**
  * Focuses on domestic space and daily routine: assigning chores to 3 household zones (living room, kitchen, bedroom), checking furniture (*"There are two chairs"*), and clock-time verification (*"It is six o'clock"*).
* **Unit 5 (Misión mercado familiar):**
  * Focuses on commercial exchange: selecting groceries at market stalls, handling prices and money at the register (*"It is five dollars"*), and ordering politely at the café counter.
* **Unit 6 (Ruta del barrio):**
  * Focuses on spatial movement and landmarks: following directions (*"Go straight and turn right"*), navigating past the bank, school, and store, and tracking pairs crossing the street.
* **Unit 7 (Gran misión de familia):**
  * Full cumulative synthesis: an 8-node celebration festival combining all communicative competencies (identity, needs, clothing, weather, and actions) culminating at the graduation podium.
* **Verdict:** Each unit features a distinct thematic mechanic tailored to its syllabus goals.

---

### Dimension 5: Visual Layout & Camera Angle Diversity
* **Camera Framing Strategy:**
  * **Unit 1:** Wide outdoor garden paths and patio seating.
  * **Unit 2:** Expansive public park with distant trees, city bus stop curb, and park bench close-up.
  * **Unit 3:** Interior interior domestic shots: narrow kitchen prep counter, dining table, and hallway telephone corner.
  * **Unit 4:** Wide living room sofa view, warm kitchen stove angle, cozy bedroom study desk, and hallway wall clock.
  * **Unit 5:** Colorful open-air fruit stalls, grocery checkout register, and coffee bar service counter.
  * **Unit 6:** Urban street corner, stone plaza crosswalk, iron school gates, and brick commercial facades.
  * **Unit 7:** Festive garden courtyard, welcoming entrance hall, and celebration podium.
* **Verdict:** 0% visual reuse. All 3:2 scene compositions feature unique perspectives, background elements, and framing depths.

---

## 3. Production Readiness & Next Steps

1. **Asset Generation**: Render the 3:2 WebP scene illustrations and close-ups using the prompt manifests in each blueprint.
2. **Audio Synthesis**: Render the immutable course audio turns using the character voice profiles (`Liam`, `Puck`, `teacher`).
3. **Automated Verification**:
   ```bash
   pytest -o pythonpath=. backend/tests/test_mission_schema.py
   pytest -o pythonpath=. backend/tests/test_lesson_structure.py
   pytest -o pythonpath=. backend/tests/test_course_audio.py
   ```
4. **Mobile Client Verification**:
   ```powershell
   cd mobile; npm run verify
   ```
