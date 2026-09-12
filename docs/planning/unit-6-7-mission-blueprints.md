# Unit 6 & Unit 7 Mission Blueprints & YAML Authoring Package

This package provides the complete, production-ready authoring blueprint for **Unit 6 ("Ruta del barrio")** and **Unit 7 ("Gran misión de familia")** matching the interactive mission standard established in Unit 1 ([1.10_family_scene_mission.yaml](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/backend/lessons/unit_1/1.10_family_scene_mission.yaml)).

---

## 1. Curriculum & Guardrail Alignment

Per [`docs/product/project-guardrails.md`](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/docs/product/project-guardrails.md) and [`docs/product/course-design-a1.md`](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/docs/product/course-design-a1.md):
* **Unit 6 Contract**: *Around Town* (Buildings, services, transport, prepositions, directions, movement words).
  * *Reconciliation:* In *"Ruta del barrio"*, the family navigates checkpoints across town (bank, store, school, park) following directions and locating landmarks (*"The mother is walking to the store."*, *"The father is next to the bank."*, *"The parents are walking together."*).
* **Unit 7 Contract**: *Everyday Needs and A1 Integration* (The body, feelings, clothing, weather, needs, cumulative A1 synthesis).
  * *Reconciliation:* In *"Gran misión de familia"*, the family organizes a final celebration and community gathering, synthesizing all communicative targets across A1 into an 8-node mission loop.
* **Target-to-Cue Parity**: Every visible target has exactly one cue and immutable audio turn. Multi-target scenes use `validation: "ordered"`. Voice gates use `validation: "single"` with `stage: "Speak"`.

---

## 2. Dedicated Phrase Banks

### Unit 6 Phrase Bank (Town, Locations, Movement, Directions)
1. `The mother is walking to the store.` *(La madre está caminando hacia la tienda.)*
2. `The father is waiting at the bench.` *(El padre está esperando en la banca.)*
3. `The girl is standing next to the school.` *(La niña está parada junto a la escuela.)*
4. `The boy is sitting in the park.` *(El niño está sentado en el parque.)*
5. `The grandmother is looking at the store.` *(La abuela está mirando la tienda.)*
6. `The grandfather is crossing the street.` *(El abuelo está cruzando la calle.)*
7. `The parents are walking together.` *(Los padres están caminando juntos.)*
8. `Where is the bank? It is next to the store.` *(¿Dónde está el banco? Está al lado de la tienda.)*
9. `Go straight and turn right.` *(Sigue derecho y gira a la derecha.)*
10. `The bus arrives at eight.` *(El autobús llega a las ocho.)*

### Unit 7 Phrase Bank (Cumulative A1 Synthesis)
1. `The mother is talking to the teacher.` *(La madre está hablando con la maestra.)*
2. `The father is fixing the bicycle.` *(El padre está arreglando la bicicleta.)*
3. `The girl is sitting on the chair.` *(La niña está sentada en la silla.)*
4. `The boy is writing.` *(El niño está escribiendo.)*
5. `The parents are looking at the map.` *(Los padres están mirando el mapa.)*
6. `The grandmother is looking outside.` *(La abuela está mirando hacia afuera.)*
7. `The grandfather is resting.` *(El abuelo está descansando.)*
8. `The parents are entering the celebration.` *(Los padres están entrando a la celebración.)*
9. `How are you? I am happy.` *(¿Cómo estás? Estoy feliz.)*
10. `It is cold and windy outside.` *(Hace frío y viento afuera.)*

---

## 3. Unit 6: Review (Lesson 6.9) YAML Skeleton

File: `backend/lessons/unit_6/lesson-6-9-unit-6-review.yaml`

```json
{
  "id": "lesson-6-9-unit-6-review",
  "title": "6.9 Unit 6 Review",
  "level": "Beginner A1",
  "unit_id": "unit-6",
  "unit_title": "Unit 6: Around Town",
  "unit_outcome": "Review town buildings, directions, location prepositions, and transport schedules.",
  "lesson_id": "lesson-6",
  "lesson_title": "Unit 6: Around Town",
  "sub_lesson_id": "6.9",
  "sub_lesson_title": "Unit 6 Review",
  "goal": "Consolidate town navigation, prepositions next to/across from, and direction phrases.",
  "vocabulary": [],
  "review_vocabulary": [
    "store", "bank", "school", "park", "next to", "across from", "walking", "crossing", "straight", "right"
  ],
  "grammar_function": "Where is the...?, It is next to..., and movement verb combinations.",
  "prerequisite": "Lessons 6.1-6.8 complete.",
  "speaking_outcome": "Produce two spoken direction and town-location statements.",
  "cards": [
    {
      "slide_id": "6-9.1",
      "interaction_type": "position-check",
      "stage": "Learn",
      "prompt": "The bank is next to the store.",
      "spanish_translation": "El banco está al lado de la tienda.",
      "correct_option_id": "bank-next-store",
      "options": [
        { "id": "bank-next-store", "label": "The bank is next to the store.", "image_url": "/lesson-assets/a1_u6_review_bank_store.webp" },
        { "id": "school-park", "label": "The school is across from the park.", "image_url": "/lesson-assets/a1_u6_review_school_park.webp" }
      ],
      "audio_text": "The bank is next to the store."
    },
    {
      "slide_id": "6-9.2",
      "interaction_type": "audio-targeted",
      "stage": "Recognize",
      "prompt": "Go straight and turn right.",
      "spanish_translation": "Sigue derecho y gira a la derecha.",
      "correct_option_id": "turn-right",
      "options": [
        { "id": "turn-right", "label": "Turn right.", "image_url": "/lesson-assets/a1_u6_review_turn_right.webp" },
        { "id": "turn-left", "label": "Turn left.", "image_url": "/lesson-assets/a1_u6_review_turn_left.webp" }
      ],
      "audio_text": "Go straight and turn right."
    },
    {
      "slide_id": "6-9.3",
      "interaction_type": "speak-repeat",
      "stage": "Speak",
      "prompt": "The parents are walking together.",
      "spanish_translation": "Di la frase en voz alta.",
      "correct_option_id": "speak-parents-walking",
      "options": [
        { "id": "speak-parents-walking", "label": "The parents are walking together." }
      ],
      "audio_text": "The parents are walking together."
    },
    {
      "slide_id": "6-9.4",
      "interaction_type": "mini-quiz",
      "stage": "Use",
      "prompt": "The bus arrives at eight.",
      "spanish_translation": "Elige el horario correcto.",
      "correct_option_id": "bus-at-eight",
      "options": [
        { "id": "bus-at-eight", "label": "The bus arrives at eight.", "image_url": "/lesson-assets/a1_u6_review_bus_eight.webp" },
        { "id": "bus-at-ten", "label": "The bus arrives at ten.", "image_url": "/lesson-assets/a1_u6_review_bus_ten.webp" }
      ],
      "audio_text": "The bus arrives at eight."
    }
  ]
}
```

---

## 4. Unit 6: Capstone Mission (Lesson 6.10) YAML Skeleton

File: `backend/lessons/unit_6/lesson-6-10-town-mission.yaml`

```json
{
  "id": "lesson-6-10-town-mission",
  "title": "6.10 Ruta del barrio",
  "level": "Beginner A1",
  "unit_id": "unit-6",
  "unit_title": "Unit 6: Around Town",
  "unit_outcome": "Follow navigation clues across neighborhood checkpoints, identify pairs, and speak locations.",
  "lesson_id": "lesson-6",
  "lesson_title": "Unit 6: Around Town",
  "sub_lesson_id": "6.10",
  "sub_lesson_title": "Ruta del barrio",
  "experience_type": "mission",
  "content_revision": 1,
  "mission": {
    "label": "MISIÓN FINAL · UNIDAD 6",
    "title": "Ruta del barrio",
    "briefing": "Acompaña a la familia por el barrio mientras regresan a casa. Sigue las pistas de ubicación, encuentra quién camina y quién espera, y responde las preguntas en voz alta.",
    "kickoff_image_url": "/lesson-assets/a1_u6_mission_kickoff.webp",
    "objectives": [
      "Sigue los puntos de referencia del barrio",
      "Identifica parejas y personas en movimiento",
      "Da indicaciones y confirma ubicaciones en voz alta"
    ],
    "completion_title": "¡Ruta del barrio completada!",
    "completion_message": "Recorriste el barrio con la familia, identificaste cada punto de referencia y confirmaste las direcciones en inglés.",
    "chapters": [
      { "id": "ch1-plaza-crossing", "title": "Cruce de la plaza", "objective": "Ubica quién camina hacia la tienda y quién cruza la calle." },
      { "id": "ch2-school-checkpoint", "title": "Punto de la escuela", "objective": "Identifica quién espera junto a la escuela." },
      { "id": "ch3-walking-home", "title": "Camino a casa", "objective": "Responde las preguntas de dirección en voz alta." }
    ]
  },
  "goal": "Track family movement across town checkpoints and answer location questions aloud.",
  "vocabulary": [],
  "review_vocabulary": [
    "store", "bank", "school", "park", "walking", "crossing", "waiting", "standing", "next to", "parents", "grandfather"
  ],
  "grammar_function": "Integrate direction, prepositional location phrases, and movement verbs.",
  "prerequisite": "Lessons 6.1-6.9 completed.",
  "speaking_outcome": "Speak full checkpoint location responses aloud across final voice gates.",
  "cards": [
    {
      "slide_id": "M01",
      "mission_chapter_id": "ch1-plaza-crossing",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The mother is walking to the store. The grandfather is crossing the street.",
      "correct_option_id": "target-mother-walking",
      "correct_option_ids": [
        "target-mother-walking",
        "target-grandfather-crossing"
      ],
      "options": [
        { "id": "target-mother-walking", "label": "The mother is walking to the store." },
        { "id": "target-grandfather-crossing", "label": "The grandfather is crossing the street." }
      ],
      "audio_text": "The mother is walking to the store. The grandfather is crossing the street.",
      "prompt_image_url": "/lesson-assets/a1_u6_scene_01_plaza.webp",
      "audio_turns": [
        {
          "text": "The mother is walking to the store.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u6_scene_01_plaza.webp"
        },
        {
          "text": "The grandfather is crossing the street.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u6_scene_01_plaza.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Escucha y toca en la plaza en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-mother-walking",
            "label_es": "Madre caminando",
            "rect": { "x": 0.15, "y": 0.35, "width": 0.20, "height": 0.50 },
            "accepted_option_ids": ["target-mother-walking"],
            "head_anchors": [{ "x": 0.25, "y": 0.22 }]
          },
          {
            "id": "target-grandfather-crossing",
            "label_es": "Abuelo cruzando",
            "rect": { "x": 0.60, "y": 0.38, "width": 0.22, "height": 0.48 },
            "accepted_option_ids": ["target-grandfather-crossing"],
            "head_anchors": [{ "x": 0.71, "y": 0.26 }]
          }
        ],
        "cues": [
          {
            "id": "cue-mother-walk",
            "text": "The mother is walking to the store.",
            "answer_text": "The mother is walking to the store.",
            "target_id": "target-mother-walking",
            "option_id": "target-mother-walking"
          },
          {
            "id": "cue-grandfather-cross",
            "text": "The grandfather is crossing the street.",
            "answer_text": "The grandfather is crossing the street.",
            "target_id": "target-grandfather-crossing",
            "option_id": "target-grandfather-crossing"
          }
        ]
      }
    },
    {
      "slide_id": "M02",
      "mission_chapter_id": "ch2-school-checkpoint",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The girl is standing next to the school. The parents are walking together.",
      "correct_option_id": "target-girl-school",
      "correct_option_ids": [
        "target-girl-school",
        "target-parents-walking"
      ],
      "options": [
        { "id": "target-girl-school", "label": "The girl is standing next to the school." },
        { "id": "target-parents-walking", "label": "The parents are walking together." }
      ],
      "audio_text": "The girl is standing next to the school. The parents are walking together.",
      "prompt_image_url": "/lesson-assets/a1_u6_scene_02_school.webp",
      "audio_turns": [
        {
          "text": "The girl is standing next to the school.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u6_scene_02_school.webp"
        },
        {
          "text": "The parents are walking together.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u6_scene_02_school.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Toca a las personas junto a la escuela en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-girl-school",
            "label_es": "Niña junto a la escuela",
            "rect": { "x": 0.20, "y": 0.40, "width": 0.18, "height": 0.45 },
            "accepted_option_ids": ["target-girl-school"],
            "head_anchors": [{ "x": 0.29, "y": 0.28 }]
          },
          {
            "id": "target-parents-walking",
            "label_es": "Pareja caminando",
            "rect": { "x": 0.55, "y": 0.35, "width": 0.35, "height": 0.50 },
            "accepted_option_ids": ["target-parents-walking"],
            "head_anchors": [
              { "x": 0.63, "y": 0.22 },
              { "x": 0.77, "y": 0.24 }
            ]
          }
        ],
        "cues": [
          {
            "id": "cue-girl-school",
            "text": "The girl is standing next to the school.",
            "answer_text": "The girl is standing next to the school.",
            "target_id": "target-girl-school",
            "option_id": "target-girl-school"
          },
          {
            "id": "cue-parents-walk",
            "text": "The parents are walking together.",
            "answer_text": "The parents are walking together.",
            "target_id": "target-parents-walking",
            "option_id": "target-parents-walking"
          }
        ]
      }
    },
    {
      "slide_id": "M03",
      "mission_chapter_id": "ch3-walking-home",
      "interaction_type": "mission-game",
      "stage": "Speak",
      "prompt": "Where is the bank? The bank is next to the store.",
      "correct_option_id": "voice-bank-store",
      "options": [
        { "id": "voice-bank-store", "label": "The bank is next to the store." }
      ],
      "audio_text": "Where is the bank?",
      "prompt_image_url": "/lesson-assets/a1_u6_scene_03_corner_checkpoint.webp",
      "audio_turns": [
        {
          "text": "Where is the bank?",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u6_scene_03_corner_checkpoint.webp"
        }
      ],
      "mission_game": {
        "kind": "voice-gate",
        "instruction_es": "Escucha la pregunta y lee la respuesta en voz alta.",
        "validation": "single",
        "targets": [
          {
            "id": "target-voice-gate-bank",
            "label_es": "Fachada del banco",
            "rect": { "x": 0.35, "y": 0.25, "width": 0.30, "height": 0.60 },
            "accepted_option_ids": ["voice-bank-store"],
            "head_anchors": [{ "x": 0.50, "y": 0.18 }]
          }
        ],
        "cues": [
          {
            "id": "cue-voice-bank",
            "text": "The bank is next to the store.",
            "answer_text": "The bank is next to the store.",
            "target_id": "target-voice-gate-bank",
            "option_id": "voice-bank-store"
          }
        ]
      }
    }
  ]
}
```

---

## 5. Unit 7: Review (Lesson 7.9) YAML Skeleton

File: `backend/lessons/unit_7/lesson-7-9-unit-7-review.yaml`

```json
{
  "id": "lesson-7-9-unit-7-review",
  "title": "7.9 Unit 7 Review",
  "level": "Beginner A1",
  "unit_id": "unit-7",
  "unit_title": "Unit 7: Everyday Needs and A1 Integration",
  "unit_outcome": "Review body parts, clothing, feelings, weather, and comprehensive A1 patterns.",
  "lesson_id": "lesson-7",
  "lesson_title": "Unit 7: Everyday Needs and A1 Integration",
  "sub_lesson_id": "7.9",
  "sub_lesson_title": "Unit 7 Review",
  "goal": "Consolidate body, feelings, clothing, weather, and conversational synthesis across all A1 units.",
  "vocabulary": [],
  "review_vocabulary": [
    "happy", "tired", "cold", "rainy", "coat", "shoes", "head", "eyes", "hands", "talking", "fixing"
  ],
  "grammar_function": "Cumulative integration of be, have, want, like, and present continuous.",
  "prerequisite": "Lessons 7.1-7.8 complete.",
  "speaking_outcome": "Deliver two spoken comprehensive self-expression and condition statements.",
  "cards": [
    {
      "slide_id": "7-9.1",
      "interaction_type": "single-target-round",
      "stage": "Learn",
      "prompt": "How are you? I am happy.",
      "spanish_translation": "¿Cómo estás? Estoy feliz.",
      "correct_option_id": "feel-happy",
      "options": [
        { "id": "feel-happy", "label": "I am happy.", "image_url": "/lesson-assets/a1_u7_review_happy.webp" },
        { "id": "feel-tired", "label": "I am tired.", "image_url": "/lesson-assets/a1_u7_review_tired.webp" }
      ],
      "audio_text": "How are you? I am happy."
    },
    {
      "slide_id": "7-9.2",
      "interaction_type": "mixed-target-round",
      "stage": "Recognize",
      "prompt": "It is cold outside. She needs a warm coat.",
      "spanish_translation": "Hace frío afuera. Ella necesita un abrigo.",
      "correct_option_id": "cold-coat",
      "options": [
        { "id": "cold-coat", "label": "Cold with a coat.", "image_url": "/lesson-assets/a1_u7_review_coat.webp" },
        { "id": "hot-shirt", "label": "Hot with a shirt.", "image_url": "/lesson-assets/a1_u7_review_shirt.webp" }
      ],
      "audio_text": "It is cold outside. She needs a warm coat."
    },
    {
      "slide_id": "7-9.3",
      "interaction_type": "speak-reflection",
      "stage": "Speak",
      "prompt": "The father is fixing the bicycle.",
      "spanish_translation": "Di qué está haciendo el padre.",
      "correct_option_id": "speak-father-fixing",
      "options": [
        { "id": "speak-father-fixing", "label": "The father is fixing the bicycle." }
      ],
      "audio_text": "The father is fixing the bicycle."
    },
    {
      "slide_id": "7-9.4",
      "interaction_type": "confidence-summary",
      "stage": "Use",
      "prompt": "The parents are looking at the map.",
      "spanish_translation": "Elige la acción que describe la imagen.",
      "correct_option_id": "parents-map",
      "options": [
        { "id": "parents-map", "label": "The parents are looking at the map.", "image_url": "/lesson-assets/a1_u7_review_map.webp" },
        { "id": "children-playing", "label": "The children are playing.", "image_url": "/lesson-assets/a1_u7_review_playing.webp" }
      ],
      "audio_text": "The parents are looking at the map."
    }
  ]
}
```

---

## 6. Unit 7: Capstone Mission (Lesson 7.10) YAML Skeleton

File: `backend/lessons/unit_7/lesson-7-10-grand-a1-mission.yaml`

```json
{
  "id": "lesson-7-10-grand-a1-mission",
  "title": "7.10 Gran misión de familia",
  "level": "Beginner A1",
  "unit_id": "unit-7",
  "unit_title": "Unit 7: Everyday Needs and A1 Integration",
  "unit_outcome": "Complete the grand multi-challenge A1 capstone synthesizing all units into one cohesive celebration event.",
  "lesson_id": "lesson-7",
  "lesson_title": "Unit 7: Everyday Needs and A1 Integration",
  "sub_lesson_id": "7.10",
  "sub_lesson_title": "Gran misión de familia",
  "experience_type": "mission",
  "content_revision": 1,
  "mission": {
    "label": "MISIÓN FINAL DE CURSO · A1",
    "title": "Gran misión de familia",
    "briefing": "Última misión de la unidad y del nivel A1: organiza un evento familiar completo. Usa todo lo que aprendiste para identificar a las personas, seguir sus acciones, entender sus necesidades y celebrar juntos.",
    "kickoff_image_url": "/lesson-assets/a1_u7_mission_kickoff.webp",
    "objectives": [
      "Identifica a cada familiar y sus acciones en el evento",
      "Responde a preguntas de ropa, clima y necesidades",
      "Supera el desafío final en voz alta para completar el nivel A1"
    ],
    "completion_title": "¡Nivel A1 Completado!",
    "completion_message": "¡Felicidades! Superaste todos los desafíos de la gran misión familiar, demostraste tu comprensión auditiva y hablaste en inglés con confianza.",
    "chapters": [
      { "id": "ch1-event-setup", "title": "Montaje del evento", "objective": "Ubica quién repara la bicicleta y quién habla con la maestra." },
      { "id": "ch2-family-arrival", "title": "Llegada de la familia", "objective": "Identifica parejas que entran y personas sentadas." },
      { "id": "ch3-final-graduation", "title": "Celebración y graduación A1", "objective": "Responde las preguntas finales en voz alta." }
    ]
  },
  "goal": "Synthesize all A1 language structures in a comprehensive 8-node narrative challenge and complete final voice gates.",
  "vocabulary": [],
  "review_vocabulary": [
    "teacher", "bicycle", "chair", "writing", "map", "outside", "resting", "happy", "cold", "parents", "father", "mother"
  ],
  "grammar_function": "Full A1 cumulative grammar synthesis: present continuous, modals, questions, descriptions, and needs.",
  "prerequisite": "Lessons 1.1 through 7.9 completed.",
  "speaking_outcome": "Demonstrate complete A1 spoken mastery across final multi-question voice challenge gates.",
  "cards": [
    {
      "slide_id": "M01",
      "mission_chapter_id": "ch1-event-setup",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The mother is talking to the teacher. The father is fixing the bicycle.",
      "correct_option_id": "target-mother-teacher",
      "correct_option_ids": [
        "target-mother-teacher",
        "target-father-bike"
      ],
      "options": [
        { "id": "target-mother-teacher", "label": "The mother is talking to the teacher." },
        { "id": "target-father-bike", "label": "The father is fixing the bicycle." }
      ],
      "audio_text": "The mother is talking to the teacher. The father is fixing the bicycle.",
      "prompt_image_url": "/lesson-assets/a1_u7_scene_01_courtyard.webp",
      "audio_turns": [
        {
          "text": "The mother is talking to the teacher.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u7_scene_01_courtyard.webp"
        },
        {
          "text": "The father is fixing the bicycle.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u7_scene_01_courtyard.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Escucha y toca en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-mother-teacher",
            "label_es": "Madre y maestra",
            "rect": { "x": 0.12, "y": 0.35, "width": 0.30, "height": 0.50 },
            "accepted_option_ids": ["target-mother-teacher"],
            "head_anchors": [
              { "x": 0.20, "y": 0.22 },
              { "x": 0.32, "y": 0.24 }
            ]
          },
          {
            "id": "target-father-bike",
            "label_es": "Padre con bicicleta",
            "rect": { "x": 0.60, "y": 0.38, "width": 0.25, "height": 0.48 },
            "accepted_option_ids": ["target-father-bike"],
            "head_anchors": [{ "x": 0.72, "y": 0.26 }]
          }
        ],
        "cues": [
          {
            "id": "cue-mother-teach",
            "text": "The mother is talking to the teacher.",
            "answer_text": "The mother is talking to the teacher.",
            "target_id": "target-mother-teacher",
            "option_id": "target-mother-teacher"
          },
          {
            "id": "cue-father-bike",
            "text": "The father is fixing the bicycle.",
            "answer_text": "The father is fixing the bicycle.",
            "target_id": "target-father-bike",
            "option_id": "target-father-bike"
          }
        ]
      }
    },
    {
      "slide_id": "M02",
      "mission_chapter_id": "ch2-family-arrival",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The girl is sitting on the chair. The parents are entering.",
      "correct_option_id": "target-girl-chair",
      "correct_option_ids": [
        "target-girl-chair",
        "target-parents-entering"
      ],
      "options": [
        { "id": "target-girl-chair", "label": "The girl is sitting on the chair." },
        { "id": "target-parents-entering", "label": "The parents are entering." }
      ],
      "audio_text": "The girl is sitting on the chair. The parents are entering.",
      "prompt_image_url": "/lesson-assets/a1_u7_scene_02_entrance_hall.webp",
      "audio_turns": [
        {
          "text": "The girl is sitting on the chair.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u7_scene_02_entrance_hall.webp"
        },
        {
          "text": "The parents are entering.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u7_scene_02_entrance_hall.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Toca a cada persona en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-girl-chair",
            "label_es": "Niña sentada",
            "rect": { "x": 0.18, "y": 0.40, "width": 0.18, "height": 0.45 },
            "accepted_option_ids": ["target-girl-chair"],
            "head_anchors": [{ "x": 0.27, "y": 0.28 }]
          },
          {
            "id": "target-parents-entering",
            "label_es": "Pareja entrando",
            "rect": { "x": 0.55, "y": 0.32, "width": 0.35, "height": 0.55 },
            "accepted_option_ids": ["target-parents-entering"],
            "head_anchors": [
              { "x": 0.64, "y": 0.20 },
              { "x": 0.78, "y": 0.22 }
            ]
          }
        ],
        "cues": [
          {
            "id": "cue-girl-chair",
            "text": "The girl is sitting on the chair.",
            "answer_text": "The girl is sitting on the chair.",
            "target_id": "target-girl-chair",
            "option_id": "target-girl-chair"
          },
          {
            "id": "cue-parents-enter",
            "text": "The parents are entering.",
            "answer_text": "The parents are entering.",
            "target_id": "target-parents-entering",
            "option_id": "target-parents-entering"
          }
        ]
      }
    },
    {
      "slide_id": "M03",
      "mission_chapter_id": "ch3-final-graduation",
      "interaction_type": "mission-game",
      "stage": "Speak",
      "prompt": "How are you? I am happy.",
      "correct_option_id": "voice-happy-graduation",
      "options": [
        { "id": "voice-happy-graduation", "label": "I am happy." }
      ],
      "audio_text": "How are you?",
      "prompt_image_url": "/lesson-assets/a1_u7_scene_03_stage_podium.webp",
      "audio_turns": [
        {
          "text": "How are you?",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u7_scene_03_stage_podium.webp"
        }
      ],
      "mission_game": {
        "kind": "voice-gate",
        "instruction_es": "Escucha la pregunta y responde en voz alta.",
        "validation": "single",
        "targets": [
          {
            "id": "target-voice-gate-happy",
            "label_es": "Podio de graduación",
            "rect": { "x": 0.35, "y": 0.25, "width": 0.30, "height": 0.60 },
            "accepted_option_ids": ["voice-happy-graduation"],
            "head_anchors": [{ "x": 0.50, "y": 0.18 }]
          }
        ],
        "cues": [
          {
            "id": "cue-voice-happy",
            "text": "I am happy.",
            "answer_text": "I am happy.",
            "target_id": "target-voice-gate-happy",
            "option_id": "voice-happy-graduation"
          }
        ]
      }
    }
  ]
}
```

---

## 7. Media Manifest (Units 6 & 7)

| Unit | Scene ID | Filename (1536x1024 3:2) | Subject & Composition | Portrait Head $(x, y)$ | Landscape Head $(x, y)$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **U6** | `u6-town-kickoff` | `a1_u6_mission_kickoff.webp` | Town center plaza with crosswalk and bank in view | `(0.50, 0.30)` | `(0.50, 0.30)` |
| **U6** | `u6-plaza-01` | `a1_u6_scene_01_plaza.webp` | Mother walking toward grocery (L), Grandfather crossing street (R) | `(0.25, 0.22)`, `(0.71, 0.26)` | `(0.25, 0.22)`, `(0.71, 0.26)` |
| **U6** | `u6-school-02` | `a1_u6_scene_02_school.webp` | Girl standing outside school gates (L), Parents walking together (R) | `(0.29, 0.28)`, `(0.63, 0.22)` | `(0.29, 0.28)`, `(0.63, 0.22)` |
| **U6** | `u6-corner-03` | `a1_u6_scene_03_corner_checkpoint.webp` | Corner landmark: Bank building adjacent to convenience store | `(0.50, 0.18)` | `(0.50, 0.18)` |
| **U7** | `u7-event-kickoff` | `a1_u7_mission_kickoff.webp` | Festively decorated garden courtyard with banner | `(0.50, 0.32)` | `(0.50, 0.32)` |
| **U7** | `u7-courtyard-01` | `a1_u7_scene_01_courtyard.webp` | Mother chatting with teacher (L), Father repairing bike (R) | `(0.20, 0.22)`, `(0.72, 0.26)` | `(0.20, 0.22)`, `(0.72, 0.26)` |
| **U7** | `u7-hall-02` | `a1_u7_scene_02_entrance_hall.webp` | Girl sitting on wooden chair (L), Parents entering doorway (R) | `(0.27, 0.28)`, `(0.64, 0.20)` | `(0.27, 0.28)`, `(0.64, 0.20)` |
| **U7** | `u7-podium-03` | `a1_u7_scene_03_stage_podium.webp` | Celebration podium with Liam congratulating learner | `(0.50, 0.18)` | `(0.50, 0.18)` |

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
