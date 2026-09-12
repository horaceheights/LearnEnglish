# Unit 4 & Unit 5 Mission Blueprints & YAML Authoring Package

This package provides the complete, production-ready authoring blueprint for **Unit 4 ("Casa en orden")** and **Unit 5 ("Misión mercado familiar")** matching the interactive mission standard established in Unit 1 ([1.10_family_scene_mission.yaml](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/backend/lessons/unit_1/1.10_family_scene_mission.yaml)).

---

## 1. Curriculum & Guardrail Alignment

Per [`docs/product/project-guardrails.md`](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/docs/product/project-guardrails.md) and [`docs/product/course-design-a1.md`](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/docs/product/course-design-a1.md):
* **Unit 4 Contract**: *Home and Daily Life* (Rooms, furniture, *there is/there are*, daily routines, clock time).
  * *Reconciliation:* In *"Casa en orden"*, the family readies the house across 3 zones (living room, kitchen, bedroom) for evening visitors, locating furniture and daily actions (*"The mother is cleaning in the living room."*, *"There are two chairs in the kitchen."*, *"It is six o'clock."*).
* **Unit 5 Contract**: *Food, Drinks, and Shopping* (Fruits, food items, quantities, prices, *likes/dislikes*, *wants/needs*, café/market interactions).
  * *Reconciliation:* In *"Misión mercado familiar"*, the family visits the neighborhood market and café to purchase ingredients for dinner (*"The father is buying bread."*, *"The daughter wants apples."*, *"The mother is paying five dollars."*).
* **Target-to-Cue Parity**: Every visible target has exactly one cue and immutable audio turn. Multi-target scenes use `validation: "ordered"`. Voice gates use `validation: "single"` with `stage: "Speak"`.

---

## 2. Dedicated Phrase Banks

### Unit 4 Phrase Bank (Home, Rooms, Routines, Furniture)
1. `The father is cooking in the kitchen.` *(El padre está cocinando en la cocina.)*
2. `The mother is cleaning the living room.` *(La madre está limpiando la sala.)*
3. `The daughter is drawing in the bedroom.` *(La hija está dibujando en la habitación.)*
4. `The son is watching TV.` *(El hijo está mirando la televisión.)*
5. `The grandparents are sitting on the sofa.` *(Los abuelos están sentados en el sofá.)*
6. `The grandmother is reading a book.` *(La abuela está leyendo un libro.)*
7. `There is a table in the dining room.` *(Hay una mesa en el comedor.)*
8. `There are two chairs near the window.` *(Hay dos sillas cerca de la ventana.)*
9. `It is six o'clock.` *(Son las seis en punto.)*
10. `Who is in the kitchen? The father is in the kitchen.` *(¿Quién está en la cocina? El padre está en la cocina.)*

### Unit 5 Phrase Bank (Food, Drinks, Market, Shopping)
1. `The father is buying bread.` *(El padre está comprando pan.)*
2. `The mother is paying at the register.` *(La madre está pagando en la caja.)*
3. `The daughter is choosing red apples.` *(La hija está eligiendo manzanas rojas.)*
4. `The son wants water.` *(El hijo quiere agua.)*
5. `The grandmother is looking at the clock.` *(La abuela está mirando el reloj.)*
6. `The grandfather has five dollars.` *(El abuelo tiene cinco dólares.)*
7. `The two brothers are waiting outside.` *(Los dos hermanos están esperando afuera.)*
8. `How much is it? It is five dollars.` *(¿Cuánto cuesta? Son cinco dólares.)*
9. `I like fruit. I do not like fish.` *(Me gusta la fruta. No me gusta el pescado.)*
10. `What does she want? She wants tea.` *(¿Qué quiere ella? Ella quiere té.)*

---

## 3. Unit 4: Review (Lesson 4.9) YAML Skeleton

File: `backend/lessons/unit_4/lesson-4-9-unit-4-review.yaml`

```json
{
  "id": "lesson-4-9-unit-4-review",
  "title": "4.9 Unit 4 Review",
  "level": "Beginner A1",
  "unit_id": "unit-4",
  "unit_title": "Unit 4: Home and Daily Life",
  "unit_outcome": "Review rooms, furniture, there is/are, daily routines, and time in context.",
  "lesson_id": "lesson-4",
  "lesson_title": "Unit 4: Home and Daily Life",
  "sub_lesson_id": "4.9",
  "sub_lesson_title": "Unit 4 Review",
  "goal": "Consolidate house rooms, home furniture, location prepositions, and routine statements with zero untaught chunks.",
  "vocabulary": [],
  "review_vocabulary": [
    "kitchen", "bedroom", "living room", "bathroom", "table", "chair", "sofa", "bed", "cleaning", "cooking", "drawing", "watching"
  ],
  "grammar_function": "Mixed There is/are, in the room, and present continuous routine statements.",
  "prerequisite": "Lessons 4.1-4.8 complete.",
  "speaking_outcome": "Produce two spoken room-and-object descriptions with guided audio support.",
  "cards": [
    {
      "slide_id": "4-9.1",
      "interaction_type": "flash-challenge",
      "stage": "Learn",
      "prompt": "The book is on the table.",
      "spanish_translation": "El libro está sobre la mesa.",
      "correct_option_id": "book-table",
      "options": [
        { "id": "book-table", "label": "The book is on the table.", "image_url": "/lesson-assets/a1_u4_review_table.webp" },
        { "id": "chair-kitchen", "label": "There is a chair.", "image_url": "/lesson-assets/a1_u4_review_chair.webp" }
      ],
      "audio_text": "The book is on the table."
    },
    {
      "slide_id": "4-9.2",
      "interaction_type": "confidence-check",
      "stage": "Recognize",
      "prompt": "There are two chairs in the kitchen.",
      "spanish_translation": "Hay dos sillas en la cocina.",
      "correct_option_id": "two-chairs",
      "options": [
        { "id": "two-chairs", "label": "Two chairs in the kitchen.", "image_url": "/lesson-assets/a1_u4_review_kitchen_chairs.webp" },
        { "id": "one-sofa", "label": "One sofa in the living room.", "image_url": "/lesson-assets/a1_u4_review_living_sofa.webp" }
      ],
      "audio_text": "There are two chairs in the kitchen."
    },
    {
      "slide_id": "4-9.3",
      "interaction_type": "speak-repeat",
      "stage": "Speak",
      "prompt": "The mother is cleaning the living room.",
      "spanish_translation": "Di la frase en voz alta.",
      "correct_option_id": "speak-mother-cleaning",
      "options": [
        { "id": "speak-mother-cleaning", "label": "The mother is cleaning the living room." }
      ],
      "audio_text": "The mother is cleaning the living room."
    },
    {
      "slide_id": "4-9.4",
      "interaction_type": "error-review",
      "stage": "Use",
      "prompt": "It is seven o'clock.",
      "spanish_translation": "Elige la hora correcta.",
      "correct_option_id": "seven-oclock",
      "options": [
        { "id": "seven-oclock", "label": "It is seven o'clock.", "image_url": "/lesson-assets/a1_u4_review_clock_seven.webp" },
        { "id": "nine-oclock", "label": "It is nine o'clock.", "image_url": "/lesson-assets/a1_u4_review_clock_nine.webp" }
      ],
      "audio_text": "It is seven o'clock."
    }
  ]
}
```

---

## 4. Unit 4: Capstone Mission (Lesson 4.10) YAML Skeleton

File: `backend/lessons/unit_4/lesson-4-10-my-day-mission.yaml`

```json
{
  "id": "lesson-4-10-my-day-mission",
  "title": "4.10 Casa en orden",
  "level": "Beginner A1",
  "unit_id": "unit-4",
  "unit_title": "Unit 4: Home and Daily Life",
  "unit_outcome": "Follow audio clues to organize rooms, assign activities to family members, and speak time checks.",
  "lesson_id": "lesson-4",
  "lesson_title": "Unit 4: Home and Daily Life",
  "sub_lesson_id": "4.10",
  "sub_lesson_title": "Casa en orden",
  "experience_type": "mission",
  "content_revision": 1,
  "mission": {
    "label": "MISIÓN FINAL · UNIDAD 4",
    "title": "Casa en orden",
    "briefing": "La familia prepara la casa para recibir una visita especial. Escucha cada pista, encuentra a cada persona en su habitación y confirma que todo esté listo a tiempo.",
    "kickoff_image_url": "/lesson-assets/a1_u4_mission_kickoff.webp",
    "objectives": [
      "Ubica a cada persona en su habitación",
      "Verifica muebles y objetos en su lugar",
      "Confirma la hora antes de que lleguen los invitados"
    ],
    "completion_title": "¡Casa lista para la visita!",
    "completion_message": "Asignaste cada actividad a su habitación, verificaste el orden de la casa y respondiste en voz alta a tiempo.",
    "chapters": [
      { "id": "ch1-living-room", "title": "En la sala", "objective": "Identifica quién limpia y quién descansa en la sala." },
      { "id": "ch2-kitchen-dining", "title": "Cocina y comedor", "objective": "Ubica las actividades y objetos en la cocina." },
      { "id": "ch3-bedrooms-study", "title": "Habitaciones y estudio", "objective": "Revisa quién dibuja y quién organiza su cuarto." },
      { "id": "ch4-time-check", "title": "Control de la hora", "objective": "Responde las preguntas de hora y ubicación en voz alta." }
    ]
  },
  "goal": "Identify people and furniture across house zones and answer questions aloud before visitors arrive.",
  "vocabulary": [],
  "review_vocabulary": [
    "kitchen", "living room", "bedroom", "dining room", "sofa", "table", "chair", "bed", "cleaning", "cooking", "drawing", "sitting", "six o'clock"
  ],
  "grammar_function": "Integrate subject + be + verb-ing + prepositional room phrases and There is/are.",
  "prerequisite": "Lessons 4.1-4.9 completed.",
  "speaking_outcome": "Answer location and time questions aloud across final voice gates.",
  "cards": [
    {
      "slide_id": "M01",
      "mission_chapter_id": "ch1-living-room",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The mother is cleaning. The grandparents are sitting on the sofa.",
      "correct_option_id": "target-mother-cleaning",
      "correct_option_ids": [
        "target-mother-cleaning",
        "target-grandparents-sofa"
      ],
      "options": [
        { "id": "target-mother-cleaning", "label": "The mother is cleaning." },
        { "id": "target-grandparents-sofa", "label": "The grandparents are sitting on the sofa." }
      ],
      "audio_text": "The mother is cleaning. The grandparents are sitting on the sofa.",
      "prompt_image_url": "/lesson-assets/a1_u4_scene_01_living_room.webp",
      "audio_turns": [
        {
          "text": "The mother is cleaning.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u4_scene_01_living_room.webp"
        },
        {
          "text": "The grandparents are sitting on the sofa.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u4_scene_01_living_room.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Escucha y toca a las personas en la sala en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-mother-cleaning",
            "label_es": "Madre limpiando",
            "rect": { "x": 0.15, "y": 0.35, "width": 0.20, "height": 0.50 },
            "accepted_option_ids": ["target-mother-cleaning"],
            "head_anchors": [{ "x": 0.25, "y": 0.22 }]
          },
          {
            "id": "target-grandparents-sofa",
            "label_es": "Abuelos en el sofá",
            "rect": { "x": 0.55, "y": 0.40, "width": 0.35, "height": 0.45 },
            "accepted_option_ids": ["target-grandparents-sofa"],
            "head_anchors": [
              { "x": 0.65, "y": 0.28 },
              { "x": 0.78, "y": 0.29 }
            ]
          }
        ],
        "cues": [
          {
            "id": "cue-mother-clean",
            "text": "The mother is cleaning.",
            "answer_text": "The mother is cleaning.",
            "target_id": "target-mother-cleaning",
            "option_id": "target-mother-cleaning"
          },
          {
            "id": "cue-grandparents-sofa",
            "text": "The grandparents are sitting on the sofa.",
            "answer_text": "The grandparents are sitting on the sofa.",
            "target_id": "target-grandparents-sofa",
            "option_id": "target-grandparents-sofa"
          }
        ]
      }
    },
    {
      "slide_id": "M02",
      "mission_chapter_id": "ch2-kitchen-dining",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The father is cooking. There are two chairs in the dining room.",
      "correct_option_id": "target-father-cooking",
      "correct_option_ids": [
        "target-father-cooking",
        "target-chairs-dining"
      ],
      "options": [
        { "id": "target-father-cooking", "label": "The father is cooking." },
        { "id": "target-chairs-dining", "label": "There are two chairs." }
      ],
      "audio_text": "The father is cooking. There are two chairs in the dining room.",
      "prompt_image_url": "/lesson-assets/a1_u4_scene_02_kitchen_dining.webp",
      "audio_turns": [
        {
          "text": "The father is cooking.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u4_scene_02_kitchen_dining.webp"
        },
        {
          "text": "There are two chairs in the dining room.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u4_scene_02_kitchen_dining.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Escucha y toca en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-father-cooking",
            "label_es": "Padre cocinando",
            "rect": { "x": 0.18, "y": 0.30, "width": 0.22, "height": 0.55 },
            "accepted_option_ids": ["target-father-cooking"],
            "head_anchors": [{ "x": 0.29, "y": 0.18 }]
          },
          {
            "id": "target-chairs-dining",
            "label_es": "Sillas del comedor",
            "rect": { "x": 0.60, "y": 0.45, "width": 0.30, "height": 0.40 },
            "accepted_option_ids": ["target-chairs-dining"],
            "head_anchors": [{ "x": 0.75, "y": 0.35 }]
          }
        ],
        "cues": [
          {
            "id": "cue-father-cook",
            "text": "The father is cooking.",
            "answer_text": "The father is cooking.",
            "target_id": "target-father-cooking",
            "option_id": "target-father-cooking"
          },
          {
            "id": "cue-chairs-dining",
            "text": "There are two chairs in the dining room.",
            "answer_text": "There are two chairs in the dining room.",
            "target_id": "target-chairs-dining",
            "option_id": "target-chairs-dining"
          }
        ]
      }
    },
    {
      "slide_id": "M03",
      "mission_chapter_id": "ch3-bedrooms-study",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The daughter is drawing in the bedroom. The son is watching TV.",
      "correct_option_id": "target-daughter-drawing",
      "correct_option_ids": [
        "target-daughter-drawing",
        "target-son-tv"
      ],
      "options": [
        { "id": "target-daughter-drawing", "label": "The daughter is drawing." },
        { "id": "target-son-tv", "label": "The son is watching TV." }
      ],
      "audio_text": "The daughter is drawing in the bedroom. The son is watching TV.",
      "prompt_image_url": "/lesson-assets/a1_u4_scene_03_bedroom.webp",
      "audio_turns": [
        {
          "text": "The daughter is drawing in the bedroom.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u4_scene_03_bedroom.webp"
        },
        {
          "text": "The son is watching TV.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u4_scene_03_bedroom.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Toca a cada persona en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-daughter-drawing",
            "label_es": "Hija dibujando",
            "rect": { "x": 0.20, "y": 0.40, "width": 0.20, "height": 0.45 },
            "accepted_option_ids": ["target-daughter-drawing"],
            "head_anchors": [{ "x": 0.30, "y": 0.28 }]
          },
          {
            "id": "target-son-tv",
            "label_es": "Hijo mirando TV",
            "rect": { "x": 0.62, "y": 0.42, "width": 0.22, "height": 0.42 },
            "accepted_option_ids": ["target-son-tv"],
            "head_anchors": [{ "x": 0.73, "y": 0.30 }]
          }
        ],
        "cues": [
          {
            "id": "cue-daughter-draw",
            "text": "The daughter is drawing in the bedroom.",
            "answer_text": "The daughter is drawing in the bedroom.",
            "target_id": "target-daughter-drawing",
            "option_id": "target-daughter-drawing"
          },
          {
            "id": "cue-son-tv",
            "text": "The son is watching TV.",
            "answer_text": "The son is watching TV.",
            "target_id": "target-son-tv",
            "option_id": "target-son-tv"
          }
        ]
      }
    },
    {
      "slide_id": "M04",
      "mission_chapter_id": "ch4-time-check",
      "interaction_type": "mission-game",
      "stage": "Speak",
      "prompt": "What time is it? It is six o'clock.",
      "correct_option_id": "voice-time-six",
      "options": [
        { "id": "voice-time-six", "label": "It is six o'clock." }
      ],
      "audio_text": "What time is it?",
      "prompt_image_url": "/lesson-assets/a1_u4_scene_04_clock_check.webp",
      "audio_turns": [
        {
          "text": "What time is it?",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u4_scene_04_clock_check.webp"
        }
      ],
      "mission_game": {
        "kind": "voice-gate",
        "instruction_es": "Escucha la pregunta y lee la respuesta en voz alta.",
        "validation": "single",
        "targets": [
          {
            "id": "target-voice-gate-time",
            "label_es": "Reloj de pared",
            "rect": { "x": 0.35, "y": 0.20, "width": 0.30, "height": 0.60 },
            "accepted_option_ids": ["voice-time-six"],
            "head_anchors": [{ "x": 0.50, "y": 0.15 }]
          }
        ],
        "cues": [
          {
            "id": "cue-voice-time",
            "text": "It is six o'clock.",
            "answer_text": "It is six o'clock.",
            "target_id": "target-voice-gate-time",
            "option_id": "voice-time-six"
          }
        ]
      }
    }
  ]
}
```

---

## 5. Unit 5: Review (Lesson 5.9) YAML Skeleton

File: `backend/lessons/unit_5/lesson-5-9-unit-5-review.yaml`

```json
{
  "id": "lesson-5-9-unit-5-review",
  "title": "5.9 Unit 5 Review",
  "level": "Beginner A1",
  "unit_id": "unit-5",
  "unit_title": "Unit 5: Food, Drinks, and Shopping",
  "unit_outcome": "Review food, drinks, quantities, preferences, and prices.",
  "lesson_id": "lesson-5",
  "lesson_title": "Unit 5: Food, Drinks, and Shopping",
  "sub_lesson_id": "5.9",
  "sub_lesson_title": "Unit 5 Review",
  "goal": "Consolidate food and drink vocabulary, likes/dislikes, wants/needs, and prices with zero new language chunks.",
  "vocabulary": [],
  "review_vocabulary": [
    "apples", "bread", "water", "tea", "coffee", "fruit", "buying", "paying", "dollars", "want", "like"
  ],
  "grammar_function": "Mixed I like/do not like, She wants/needs, and price expressions.",
  "prerequisite": "Lessons 5.1-5.8 complete.",
  "speaking_outcome": "Repeat polite food and café orders aloud with clear pronunciation.",
  "cards": [
    {
      "slide_id": "5-9.1",
      "interaction_type": "flash-challenge",
      "stage": "Learn",
      "prompt": "I like apples. I do not like fish.",
      "spanish_translation": "Me gustan las manzanas. No me gusta el pescado.",
      "correct_option_id": "like-apples",
      "options": [
        { "id": "like-apples", "label": "I like apples.", "image_url": "/lesson-assets/a1_u5_review_apples.webp" },
        { "id": "like-fish", "label": "I like fish.", "image_url": "/lesson-assets/a1_u5_review_fish.webp" }
      ],
      "audio_text": "I like apples. I do not like fish."
    },
    {
      "slide_id": "5-9.2",
      "interaction_type": "closest-choice",
      "stage": "Recognize",
      "prompt": "She wants water. He needs bread.",
      "spanish_translation": "Ella quiere agua. Él necesita pan.",
      "correct_option_id": "wants-water",
      "options": [
        { "id": "wants-water", "label": "She wants water.", "image_url": "/lesson-assets/a1_u5_review_water.webp" },
        { "id": "wants-coffee", "label": "She wants coffee.", "image_url": "/lesson-assets/a1_u5_review_coffee.webp" }
      ],
      "audio_text": "She wants water. He needs bread."
    },
    {
      "slide_id": "5-9.3",
      "interaction_type": "repeat-after-me",
      "stage": "Speak",
      "prompt": "Coffee, please. Yes, thank you.",
      "spanish_translation": "Pide un café cortésmente.",
      "correct_option_id": "speak-order-coffee",
      "options": [
        { "id": "speak-order-coffee", "label": "Coffee, please. Yes, thank you." }
      ],
      "audio_text": "Coffee, please. Yes, thank you."
    },
    {
      "slide_id": "5-9.4",
      "interaction_type": "mini-quiz",
      "stage": "Use",
      "prompt": "How much is it? It is five dollars.",
      "spanish_translation": "¿Cuánto cuesta? Son cinco dólares.",
      "correct_option_id": "price-five-dollars",
      "options": [
        { "id": "price-five-dollars", "label": "It is five dollars.", "image_url": "/lesson-assets/a1_u5_review_five_dollars.webp" },
        { "id": "price-ten-dollars", "label": "It is ten dollars.", "image_url": "/lesson-assets/a1_u5_review_ten_dollars.webp" }
      ],
      "audio_text": "How much is it? It is five dollars."
    }
  ]
}
```

---

## 6. Unit 5: Capstone Mission (Lesson 5.10) YAML Skeleton

File: `backend/lessons/unit_5/lesson-5-10-cafe-mission.yaml`

```json
{
  "id": "lesson-5-10-cafe-mission",
  "title": "5.10 Misión mercado familiar",
  "level": "Beginner A1",
  "unit_id": "unit-5",
  "unit_title": "Unit 5: Food, Drinks, and Shopping",
  "unit_outcome": "Follow audio clues to identify market stalls, food items, prices, and complete café purchases.",
  "lesson_id": "lesson-5",
  "lesson_title": "Unit 5: Food, Drinks, and Shopping",
  "sub_lesson_id": "5.10",
  "sub_lesson_title": "Misión mercado familiar",
  "experience_type": "mission",
  "content_revision": 1,
  "mission": {
    "label": "MISIÓN FINAL · UNIDAD 5",
    "title": "Misión mercado familiar",
    "briefing": "Salimos al mercado y al café a comprar todo para la cena familiar. Escucha las instrucciones, encuentra los alimentos correctos y confirma los precios antes de pagar.",
    "kickoff_image_url": "/lesson-assets/a1_u5_mission_kickoff.webp",
    "objectives": [
      "Identifica los alimentos y bebidas que busca la familia",
      "Encuentra quién compra y quién paga en el mercado",
      "Ordena cortésmente en el café y di los precios en voz alta"
    ],
    "completion_title": "¡Compras completadas con éxito!",
    "completion_message": "Compraron el pan, las frutas y las bebidas para la cena, pagaron el precio correcto y ordenaron en inglés.",
    "chapters": [
      { "id": "ch1-fruit-stand", "title": "Puesto de frutas y pan", "objective": "Encuentra quién compra pan y quién elige frutas." },
      { "id": "ch2-checkout-register", "title": "Caja y pago", "objective": "Identifica quién paga y cuánto dinero tiene." },
      { "id": "ch3-cafe-order", "title": "Orden en el café", "objective": "Escucha y responde en voz alta para pedir bebidas." }
    ]
  },
  "goal": "Select market goods, follow prices and requests, and speak café orders aloud.",
  "vocabulary": [],
  "review_vocabulary": [
    "bread", "apples", "fruit", "water", "tea", "coffee", "buying", "paying", "waiting", "five dollars", "please", "thank you"
  ],
  "grammar_function": "Integrate food wants/needs, purchasing actions, and polite requests.",
  "prerequisite": "Lessons 5.1-5.9 completed.",
  "speaking_outcome": "Speak polite café orders and price answers aloud across final voice gates.",
  "cards": [
    {
      "slide_id": "M01",
      "mission_chapter_id": "ch1-fruit-stand",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The father is buying bread. The daughter is choosing red apples.",
      "correct_option_id": "target-father-bread",
      "correct_option_ids": [
        "target-father-bread",
        "target-daughter-apples"
      ],
      "options": [
        { "id": "target-father-bread", "label": "The father is buying bread." },
        { "id": "target-daughter-apples", "label": "The daughter is choosing red apples." }
      ],
      "audio_text": "The father is buying bread. The daughter is choosing red apples.",
      "prompt_image_url": "/lesson-assets/a1_u5_scene_01_market_stall.webp",
      "audio_turns": [
        {
          "text": "The father is buying bread.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u5_scene_01_market_stall.webp"
        },
        {
          "text": "The daughter is choosing red apples.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u5_scene_01_market_stall.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Escucha y toca a las personas en el mercado en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-father-bread",
            "label_es": "Padre comprando pan",
            "rect": { "x": 0.12, "y": 0.35, "width": 0.22, "height": 0.50 },
            "accepted_option_ids": ["target-father-bread"],
            "head_anchors": [{ "x": 0.23, "y": 0.20 }]
          },
          {
            "id": "target-daughter-apples",
            "label_es": "Hija eligiendo manzanas",
            "rect": { "x": 0.60, "y": 0.42, "width": 0.20, "height": 0.45 },
            "accepted_option_ids": ["target-daughter-apples"],
            "head_anchors": [{ "x": 0.70, "y": 0.30 }]
          }
        ],
        "cues": [
          {
            "id": "cue-father-bread",
            "text": "The father is buying bread.",
            "answer_text": "The father is buying bread.",
            "target_id": "target-father-bread",
            "option_id": "target-father-bread"
          },
          {
            "id": "cue-daughter-apples",
            "text": "The daughter is choosing red apples.",
            "answer_text": "The daughter is choosing red apples.",
            "target_id": "target-daughter-apples",
            "option_id": "target-daughter-apples"
          }
        ]
      }
    },
    {
      "slide_id": "M02",
      "mission_chapter_id": "ch2-checkout-register",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The mother is paying. The grandfather has five dollars.",
      "correct_option_id": "target-mother-paying",
      "correct_option_ids": [
        "target-mother-paying",
        "target-grandfather-money"
      ],
      "options": [
        { "id": "target-mother-paying", "label": "The mother is paying." },
        { "id": "target-grandfather-money", "label": "The grandfather has five dollars." }
      ],
      "audio_text": "The mother is paying. The grandfather has five dollars.",
      "prompt_image_url": "/lesson-assets/a1_u5_scene_02_register.webp",
      "audio_turns": [
        {
          "text": "The mother is paying.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u5_scene_02_register.webp"
        },
        {
          "text": "The grandfather has five dollars.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u5_scene_02_register.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Escucha y toca en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-mother-paying",
            "label_es": "Madre pagando",
            "rect": { "x": 0.20, "y": 0.32, "width": 0.22, "height": 0.52 },
            "accepted_option_ids": ["target-mother-paying"],
            "head_anchors": [{ "x": 0.31, "y": 0.18 }]
          },
          {
            "id": "target-grandfather-money",
            "label_es": "Abuelo con dinero",
            "rect": { "x": 0.65, "y": 0.38, "width": 0.20, "height": 0.48 },
            "accepted_option_ids": ["target-grandfather-money"],
            "head_anchors": [{ "x": 0.75, "y": 0.26 }]
          }
        ],
        "cues": [
          {
            "id": "cue-mother-pay",
            "text": "The mother is paying.",
            "answer_text": "The mother is paying.",
            "target_id": "target-mother-paying",
            "option_id": "target-mother-paying"
          },
          {
            "id": "cue-grandfather-money",
            "text": "The grandfather has five dollars.",
            "answer_text": "The grandfather has five dollars.",
            "target_id": "target-grandfather-money",
            "option_id": "target-grandfather-money"
          }
        ]
      }
    },
    {
      "slide_id": "M03",
      "mission_chapter_id": "ch3-cafe-order",
      "interaction_type": "mission-game",
      "stage": "Speak",
      "prompt": "How much is it? It is five dollars.",
      "correct_option_id": "voice-price-five",
      "options": [
        { "id": "voice-price-five", "label": "It is five dollars." }
      ],
      "audio_text": "How much is it?",
      "prompt_image_url": "/lesson-assets/a1_u5_scene_03_cafe_counter.webp",
      "audio_turns": [
        {
          "text": "How much is it?",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u5_scene_03_cafe_counter.webp"
        }
      ],
      "mission_game": {
        "kind": "voice-gate",
        "instruction_es": "Escucha la pregunta y lee la respuesta en voz alta.",
        "validation": "single",
        "targets": [
          {
            "id": "target-voice-gate-cafe",
            "label_es": "Caja del café",
            "rect": { "x": 0.35, "y": 0.25, "width": 0.30, "height": 0.60 },
            "accepted_option_ids": ["voice-price-five"],
            "head_anchors": [{ "x": 0.50, "y": 0.18 }]
          }
        ],
        "cues": [
          {
            "id": "cue-voice-price",
            "text": "It is five dollars.",
            "answer_text": "It is five dollars.",
            "target_id": "target-voice-gate-cafe",
            "option_id": "voice-price-five"
          }
        ]
      }
    }
  ]
}
```

---

## 7. Media Manifest (Units 4 & 5)

| Unit | Scene ID | Filename (1536x1024 3:2) | Subject & Composition | Portrait Head $(x, y)$ | Landscape Head $(x, y)$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **U4** | `u4-house-kickoff` | `a1_u4_mission_kickoff.webp` | Front entrance of family house with hall view | `(0.50, 0.30)` | `(0.50, 0.30)` |
| **U4** | `u4-living-01` | `a1_u4_scene_01_living_room.webp` | Mother vacuuming/cleaning (L), Grandparents on sofa (R) | `(0.25, 0.22)`, `(0.65, 0.28)` | `(0.25, 0.22)`, `(0.65, 0.28)` |
| **U4** | `u4-kitchen-02` | `a1_u4_scene_02_kitchen_dining.webp` | Father stirring skillet at stove (L), Dining table & 2 chairs (R) | `(0.29, 0.18)`, `(0.75, 0.35)` | `(0.29, 0.18)`, `(0.75, 0.35)` |
| **U4** | `u4-bedroom-03` | `a1_u4_scene_03_bedroom.webp` | Daughter drawing at desk (L), Son watching small TV (R) | `(0.30, 0.28)`, `(0.73, 0.30)` | `(0.30, 0.28)`, `(0.73, 0.30)` |
| **U4** | `u4-clock-04` | `a1_u4_scene_04_clock_check.webp` | Wall clock showing exactly 6:00 above hallway console | `(0.50, 0.15)` | `(0.50, 0.15)` |
| **U5** | `u5-market-kickoff` | `a1_u5_mission_kickoff.webp` | Bustling neighborhood street market entrance | `(0.50, 0.32)` | `(0.50, 0.32)` |
| **U5** | `u5-stall-01` | `a1_u5_scene_01_market_stall.webp` | Father buying baguette bread (L), Daughter picking red apples (R) | `(0.23, 0.20)`, `(0.70, 0.30)` | `(0.23, 0.20)`, `(0.70, 0.30)` |
| **U5** | `u5-register-02` | `a1_u5_scene_02_register.webp` | Mother paying cashier (L), Grandfather holding wallet/bill (R) | `(0.31, 0.18)`, `(0.75, 0.26)` | `(0.31, 0.18)`, `(0.75, 0.26)` |
| **U5** | `u5-cafe-03` | `a1_u5_scene_03_cafe_counter.webp` | Café counter with menu board showing coffee & tea $5 | `(0.50, 0.18)` | `(0.50, 0.18)` |

---

## 8. Manual QA Script (7-Point Mission Audit)

For each newly authored mission, execute the following 7 verification steps:

1. **Objective Clarity**: Confirm the initial mission briefing displays one concise line explaining the task, without technical words (`modelo`, `señal`).
2. **Audio Reliability**: Test on slow connection (4G throttle). Verify prompt cue plays automatically within 1.5 seconds. If audio fails to load, verify the recovery state banner appears: *“Sin conexión, vuelve cuando haya señal”* with a working manual retry button.
3. **Tappable Targets**: Measure touch bounds in both portrait and landscape. Ensure every target has $\ge 48\text{dp}$ touch radius and indicators are placed strictly above the crown (or chest level for standing groups), never obscuring faces.
4. **No Hidden Indicators**: Verify that no indicator is clipped by screen edges, safe area insets, navigation buttons, or bottom action sheets.
5. **Zero Forced Scrolling**: Ensure the header, full uncropped 3:2 scene image, controls, and feedback stay completely visible in portrait (375x667) and landscape (667x375) with zero page scrolling.
6. **Cue Randomization**: Refresh/restart the card 5 times. Verify that multi-target cues shuffle presentation order (except the first guided tutorial card) without losing track of correct answer bindings.
7. **Immediate Mission Completion Feedback**: Ensure a correct tap immediately triggers positive acoustic/visual feedback without needing a *Comprobar* button; complete the mission loop and verify the celebration modal unlocks the next unit.
