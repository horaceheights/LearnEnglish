# Unit 2 & Unit 3 Mission Blueprints & YAML Authoring Package

This package provides the complete, production-ready authoring blueprint for **Unit 2** and **Unit 3** to match the interactive mission standard established in Unit 1 ([1.10_family_scene_mission.yaml](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/backend/lessons/unit_1/1.10_family_scene_mission.yaml)).

---

## 1. Curriculum & Guardrail Alignment

Per [`docs/product/project-guardrails.md`](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/docs/product/project-guardrails.md) and [`docs/product/course-design-a1.md`](file:///c:/Users/gorre/Documents/Code%20Projects/LearnEnglish/docs/product/course-design-a1.md):
* **Unit 2 Contract**: *Places, Objects, Numbers, and Colors* (Lessons 2.1–2.8 teach places, objects, colors, numbers 1–10).
  * *Reconciliation:* The narrative follows Liam and the family gathering in the park/city, searching for specific family members, objects, places, and counting items (e.g., *"The father is in the park."*, *"It is a green bus."*, *"Three red bags."*).
* **Unit 3 Contract**: *Me and Other People* (Greetings, personal information, professions, age, *have/has*).
  * *Reconciliation:* The dinner party prep mission (*"Cenas cruzadas"*) requires identifying who is speaking, their role/profession, what they have, and their actions.
* **Interactive Target Contract**: Per project guardrails, every visible mission target is interactive practice and requires exactly one cue and immutable audio turn. Multi-target scenes use `validation: "ordered"` so that every candidate is practiced before advancing. Single-target voice gates use `validation: "single"`.

---

## 2. Dedicated Phrase Banks

### Unit 2 Phrase Bank (English target with Spanish pedagogical intent)
1. `The father is running.` *(El padre está corriendo.)*
2. `The mother is reading.` *(La madre está leyendo.)*
3. `The girl is sitting on the bench.` *(La niña está sentada en la banca.)*
4. `The boy is eating.` *(El niño está comiendo.)*
5. `The parents are talking.` *(Los padres están hablando.)*
6. `The grandparents are walking.` *(Los abuelos están caminando.)*
7. `It is a green bus.` *(Es un autobús verde.)*
8. `Three red bags.` *(Tres bolsas rojas.)*
9. `What is it? It is a red car.` *(¿Qué es? Es un auto rojo.)*
10. `Who is in the park? The father is in the park.` *(¿Quién está en el parque? El padre está en el parque.)*

### Unit 3 Phrase Bank
1. `The sister is cooking.` *(La hermana está cocinando.)*
2. `The brother is playing.` *(El hermano está jugando.)*
3. `The mother is talking on the phone.` *(La madre está hablando por teléfono.)*
4. `The father is reading.` *(El padre está leyendo.)*
5. `What is your name? My name is Liam.` *(¿Cómo te llamas? Mi nombre es Liam.)*
6. `I am a teacher.` *(Soy maestro.)*
7. `She has a phone.` *(Ella tiene un teléfono.)*
8. `Who is she? She is the mother. She is a doctor.` *(¿Quién es ella? Es la madre. Es médica.)*

---

## 3. Unit 2: Review (Lesson 2.9) YAML Skeleton

File: `backend/lessons/unit_2/lesson-2-9-unit-2-review.yaml`

```json
{
  "id": "lesson-2-9-unit-2-review",
  "title": "2.9 Unit 2 Review",
  "level": "Beginner A1",
  "unit_id": "unit-2",
  "unit_title": "Unit 2: Places, Objects, Numbers, and Colors",
  "unit_outcome": "Review places, common objects, numbers 1-10, and colors in context.",
  "lesson_id": "lesson-2",
  "lesson_title": "Unit 2: Places, Objects, Numbers, and Colors",
  "sub_lesson_id": "2.9",
  "sub_lesson_title": "Unit 2 Review",
  "goal": "Retrieve Unit 2 places, objects, questions, demonstratives, numbers, and colors with zero new language chunks.",
  "vocabulary": [],
  "review_vocabulary": [
    "park", "bus", "store", "bank", "book", "pen", "bag", "car",
    "one", "two", "three", "four", "five", "red", "blue", "green"
  ],
  "grammar_function": "Integrated It is..., What is it?, This/That is..., and number-color-noun descriptions.",
  "prerequisite": "Lessons 2.1-2.8 complete.",
  "speaking_outcome": "Say Unit 2 place and object descriptions aloud with guided support.",
  "cards": [
    {
      "slide_id": "2-9.1",
      "interaction_type": "quick-recall",
      "stage": "Learn",
      "prompt": "It is a park.",
      "spanish_translation": "¿Quién es quién y qué lugar es?",
      "correct_option_id": "park",
      "options": [
        { "id": "park", "label": "A park", "image_url": "/lesson-assets/a1_u2_review_park.webp" },
        { "id": "store", "label": "A store", "image_url": "/lesson-assets/a1_u2_review_store.webp" }
      ],
      "audio_text": "It is a park."
    },
    {
      "slide_id": "2-9.2",
      "interaction_type": "listen-tap",
      "stage": "Recognize",
      "prompt": "The mother is reading.",
      "spanish_translation": "Escucha y toca al personaje.",
      "correct_option_id": "mother-reading",
      "options": [
        { "id": "mother-reading", "label": "The mother is reading.", "image_url": "/lesson-assets/a1_u2_review_mother.webp" },
        { "id": "father-running", "label": "The father is running.", "image_url": "/lesson-assets/a1_u2_review_father.webp" }
      ],
      "audio_text": "The mother is reading."
    },
    {
      "slide_id": "2-9.3",
      "interaction_type": "word-reorder",
      "stage": "Listen",
      "prompt": "Three green books.",
      "spanish_translation": "Ordena las palabras que escuchas.",
      "correct_option_id": "three-green-books",
      "options": [
        { "id": "three-green-books", "label": "Three green books." },
        { "id": "two-red-bags", "label": "Two red bags." }
      ],
      "audio_text": "Three green books."
    },
    {
      "slide_id": "2-9.4",
      "interaction_type": "speak-repeat",
      "stage": "Speak",
      "prompt": "The boy is eating.",
      "spanish_translation": "Repite la frase en voz alta.",
      "correct_option_id": "speak-boy-eating",
      "options": [
        { "id": "speak-boy-eating", "label": "The boy is eating." }
      ],
      "audio_text": "The boy is eating."
    },
    {
      "slide_id": "2-9.5",
      "interaction_type": "mini-quiz",
      "stage": "Use",
      "prompt": "What is it? It is a red car.",
      "spanish_translation": "Elige la descripción correcta.",
      "correct_option_id": "red-car",
      "options": [
        { "id": "red-car", "label": "It is a red car.", "image_url": "/lesson-assets/a1_u2_review_car_red.webp" },
        { "id": "blue-bus", "label": "It is a blue bus.", "image_url": "/lesson-assets/a1_u2_review_bus_blue.webp" }
      ],
      "audio_text": "What is it? It is a red car."
    }
  ]
}
```

---

## 4. Unit 2: Capstone Mission (Lesson 2.10) YAML Skeleton

File: `backend/lessons/unit_2/lesson-2-10-around-me-mission.yaml`

```json
{
  "id": "lesson-2-10-around-me-mission",
  "title": "2.10 Encuentro en el parque",
  "level": "Beginner A1",
  "unit_id": "unit-2",
  "unit_title": "Unit 2: Places, Objects, Numbers, and Colors",
  "unit_outcome": "Follow audio clues to identify people, locations, objects, colors, and numbers in the park.",
  "lesson_id": "lesson-2",
  "lesson_title": "Unit 2: Places, Objects, Numbers, and Colors",
  "sub_lesson_id": "2.10",
  "sub_lesson_title": "Encuentro en el parque",
  "experience_type": "mission",
  "content_revision": 1,
  "mission": {
    "label": "MISIÓN FINAL · UNIDAD 2",
    "title": "Encuentro en el parque",
    "briefing": "¿Puedes rescatar a la familia y sus pertenencias en el parque para la foto de bienvenida? Escucha con atención cada pista y toca a las personas y objetos correctos.",
    "kickoff_image_url": "/lesson-assets/a1_u2_mission_kickoff.webp",
    "objectives": [
      "Localiza a los personajes en el parque",
      "Identifica objetos y colores",
      "Reúne a todos para la foto"
    ],
    "completion_title": "¡Foto de bienvenida completada!",
    "completion_message": "Encontraste a todos en el parque, identificaste sus acciones y objetos, y respondiste las preguntas en voz alta.",
    "chapters": [
      { "id": "ch1-park-search", "title": "Búsqueda en el parque", "objective": "Escucha y toca a la persona por su acción o lugar." },
      { "id": "ch2-objects-colors", "title": "Pistas y colores", "objective": "Identifica objetos, medios de transporte y cantidades." },
      { "id": "ch3-pairs-actions", "title": "Grupos y parejas", "objective": "Encuentra grupos y parejas de dos personas." },
      { "id": "ch4-photo-call", "title": "Llamado a la foto", "objective": "Responde las preguntas en voz alta para tomar la foto." }
    ]
  },
  "goal": "Locate family members, objects, and transport in the park using Unit 2 vocabulary and speak final responses.",
  "vocabulary": [],
  "review_vocabulary": [
    "park", "bus", "car", "book", "bench", "father", "mother", "girl", "boy", "grandparents",
    "running", "reading", "sitting", "walking", "talking", "eating", "waiting",
    "red", "blue", "green", "two", "three"
  ],
  "grammar_function": "Integrate subject + be + verb-ing + place/object and demonstrative noun phrases.",
  "prerequisite": "Lessons 2.1-2.9 completed.",
  "speaking_outcome": "Answer who is in the park and identify objects aloud across final voice gates.",
  "cards": [
    {
      "slide_id": "M01",
      "mission_chapter_id": "ch1-park-search",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The father is running. The mother is reading.",
      "correct_option_id": "target-father-running",
      "correct_option_ids": [
        "target-father-running",
        "target-mother-reading"
      ],
      "options": [
        { "id": "target-father-running", "label": "The father is running." },
        { "id": "target-mother-reading", "label": "The mother is reading." }
      ],
      "audio_text": "The father is running. The mother is reading.",
      "prompt_image_url": "/lesson-assets/a1_u2_scene_01_park_path.webp",
      "audio_turns": [
        {
          "text": "The father is running.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u2_scene_01_park_path.webp"
        },
        {
          "text": "The mother is reading.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u2_scene_01_park_path.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Escucha y toca a la persona en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-father-running",
            "label_es": "Padre corriendo",
            "rect": { "x": 0.12, "y": 0.45, "width": 0.18, "height": 0.35 },
            "accepted_option_ids": ["target-father-running"],
            "head_anchors": [{ "x": 0.21, "y": 0.28 }]
          },
          {
            "id": "target-mother-reading",
            "label_es": "Madre leyendo",
            "rect": { "x": 0.65, "y": 0.48, "width": 0.18, "height": 0.32 },
            "accepted_option_ids": ["target-mother-reading"],
            "head_anchors": [{ "x": 0.74, "y": 0.32 }]
          }
        ],
        "cues": [
          {
            "id": "cue-father",
            "text": "The father is running.",
            "answer_text": "The father is running.",
            "target_id": "target-father-running",
            "option_id": "target-father-running"
          },
          {
            "id": "cue-mother",
            "text": "The mother is reading.",
            "answer_text": "The mother is reading.",
            "target_id": "target-mother-reading",
            "option_id": "target-mother-reading"
          }
        ]
      }
    },
    {
      "slide_id": "M02",
      "mission_chapter_id": "ch1-park-search",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The girl is sitting on the bench. The boy is eating.",
      "correct_option_id": "target-girl-sitting",
      "correct_option_ids": [
        "target-girl-sitting",
        "target-boy-eating"
      ],
      "options": [
        { "id": "target-girl-sitting", "label": "The girl is sitting." },
        { "id": "target-boy-eating", "label": "The boy is eating." }
      ],
      "audio_text": "The girl is sitting on the bench. The boy is eating.",
      "prompt_image_url": "/lesson-assets/a1_u2_scene_02_bench.webp",
      "audio_turns": [
        {
          "text": "The girl is sitting on the bench.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u2_scene_02_bench.webp"
        },
        {
          "text": "The boy is eating.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u2_scene_02_bench.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Escucha y toca a la persona en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-girl-sitting",
            "label_es": "Niña en banca",
            "rect": { "x": 0.25, "y": 0.50, "width": 0.16, "height": 0.30 },
            "accepted_option_ids": ["target-girl-sitting"],
            "head_anchors": [{ "x": 0.33, "y": 0.36 }]
          },
          {
            "id": "target-boy-eating",
            "label_es": "Niño comiendo",
            "rect": { "x": 0.58, "y": 0.48, "width": 0.16, "height": 0.32 },
            "accepted_option_ids": ["target-boy-eating"],
            "head_anchors": [{ "x": 0.66, "y": 0.34 }]
          }
        ],
        "cues": [
          {
            "id": "cue-girl",
            "text": "The girl is sitting on the bench.",
            "answer_text": "The girl is sitting on the bench.",
            "target_id": "target-girl-sitting",
            "option_id": "target-girl-sitting"
          },
          {
            "id": "cue-boy",
            "text": "The boy is eating.",
            "answer_text": "The boy is eating.",
            "target_id": "target-boy-eating",
            "option_id": "target-boy-eating"
          }
        ]
      }
    },
    {
      "slide_id": "M03",
      "mission_chapter_id": "ch2-objects-colors",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "It is a green bus. Three red bags.",
      "correct_option_id": "target-green-bus",
      "correct_option_ids": [
        "target-green-bus",
        "target-red-bags"
      ],
      "options": [
        { "id": "target-green-bus", "label": "It is a green bus." },
        { "id": "target-red-bags", "label": "Three red bags." }
      ],
      "audio_text": "It is a green bus. Three red bags.",
      "prompt_image_url": "/lesson-assets/a1_u2_scene_03_bus_stop.webp",
      "audio_turns": [
        {
          "text": "It is a green bus.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u2_scene_03_bus_stop.webp"
        },
        {
          "text": "Three red bags.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u2_scene_03_bus_stop.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Sigue el orden correcto de las pistas.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-green-bus",
            "label_es": "Autobús verde",
            "rect": { "x": 0.08, "y": 0.20, "width": 0.45, "height": 0.45 },
            "accepted_option_ids": ["target-green-bus"],
            "head_anchors": [{ "x": 0.30, "y": 0.15 }]
          },
          {
            "id": "target-red-bags",
            "label_es": "Tres bolsas rojas",
            "rect": { "x": 0.62, "y": 0.60, "width": 0.20, "height": 0.25 },
            "accepted_option_ids": ["target-red-bags"],
            "head_anchors": [{ "x": 0.72, "y": 0.52 }]
          }
        ],
        "cues": [
          {
            "id": "cue-bus",
            "text": "It is a green bus.",
            "answer_text": "It is a green bus.",
            "target_id": "target-green-bus",
            "option_id": "target-green-bus"
          },
          {
            "id": "cue-bags",
            "text": "Three red bags.",
            "answer_text": "Three red bags.",
            "target_id": "target-red-bags",
            "option_id": "target-red-bags"
          }
        ]
      }
    },
    {
      "slide_id": "M04",
      "mission_chapter_id": "ch3-pairs-actions",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The parents are talking. The grandparents are walking.",
      "correct_option_id": "target-parents-group",
      "correct_option_ids": [
        "target-parents-group",
        "target-grandparents-group"
      ],
      "options": [
        { "id": "target-parents-group", "label": "The parents are talking." },
        { "id": "target-grandparents-group", "label": "The grandparents are walking." }
      ],
      "audio_text": "The parents are talking. The grandparents are walking.",
      "prompt_image_url": "/lesson-assets/a1_u2_scene_04_parents.webp",
      "audio_turns": [
        {
          "text": "The parents are talking.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u2_scene_04_parents.webp"
        },
        {
          "text": "The grandparents are walking.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u2_scene_04_parents.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Toca a cada pareja en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-parents-group",
            "label_es": "Pareja",
            "rect": { "x": 0.20, "y": 0.35, "width": 0.35, "height": 0.50 },
            "accepted_option_ids": ["target-parents-group"],
            "head_anchors": [
              { "x": 0.28, "y": 0.22 },
              { "x": 0.44, "y": 0.24 }
            ]
          },
          {
            "id": "target-grandparents-group",
            "label_es": "Pareja",
            "rect": { "x": 0.60, "y": 0.38, "width": 0.32, "height": 0.48 },
            "accepted_option_ids": ["target-grandparents-group"],
            "head_anchors": [
              { "x": 0.68, "y": 0.26 },
              { "x": 0.82, "y": 0.27 }
            ]
          }
        ],
        "cues": [
          {
            "id": "cue-parents",
            "text": "The parents are talking.",
            "answer_text": "The parents are talking.",
            "target_id": "target-parents-group",
            "option_id": "target-parents-group"
          },
          {
            "id": "cue-grandparents",
            "text": "The grandparents are walking.",
            "answer_text": "The grandparents are walking.",
            "target_id": "target-grandparents-group",
            "option_id": "target-grandparents-group"
          }
        ]
      }
    },
    {
      "slide_id": "M05",
      "mission_chapter_id": "ch4-photo-call",
      "interaction_type": "mission-game",
      "stage": "Speak",
      "prompt": "Who is in the park? The father is in the park.",
      "correct_option_id": "voice-father-park",
      "options": [
        { "id": "voice-father-park", "label": "The father is in the park." }
      ],
      "audio_text": "Who is in the park?",
      "prompt_image_url": "/lesson-assets/a1_u2_scene_05_photo_father.webp",
      "audio_turns": [
        {
          "text": "Who is in the park?",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u2_scene_05_photo_father.webp"
        }
      ],
      "mission_game": {
        "kind": "voice-gate",
        "instruction_es": "Escucha la pregunta y lee la respuesta en voz alta.",
        "validation": "single",
        "targets": [
          {
            "id": "target-voice-gate-1",
            "label_es": "Entrada 1",
            "rect": { "x": 0.35, "y": 0.25, "width": 0.30, "height": 0.60 },
            "accepted_option_ids": ["voice-father-park"],
            "head_anchors": [{ "x": 0.50, "y": 0.18 }]
          }
        ],
        "cues": [
          {
            "id": "cue-voice-father",
            "text": "The father is in the park.",
            "answer_text": "The father is in the park.",
            "target_id": "target-voice-gate-1",
            "option_id": "voice-father-park"
          }
        ]
      }
    }
  ]
}
```

---

## 5. Unit 3: Review (Lesson 3.9) YAML Skeleton

File: `backend/lessons/unit_3/lesson-3-9-unit-3-review.yaml`

```json
{
  "id": "lesson-3-9-unit-3-review",
  "title": "3.9 Unit 3 Review",
  "level": "Beginner A1",
  "unit_id": "unit-3",
  "unit_title": "Unit 3: Me and Other People",
  "unit_outcome": "Review greetings, professions, personal information, and have/has.",
  "lesson_id": "lesson-3",
  "lesson_title": "Unit 3: Me and Other People",
  "sub_lesson_id": "3.9",
  "sub_lesson_title": "Unit 3 Review",
  "goal": "Consolidate personal introductions, questions with Who/What, and have/has sentences.",
  "vocabulary": [],
  "review_vocabulary": [
    "name", "teacher", "doctor", "student", "have", "has", "cooking", "playing", "sister", "brother"
  ],
  "grammar_function": "Review I am, You are, He/She has, and Who is/are questions.",
  "prerequisite": "Lessons 3.1-3.8 complete.",
  "speaking_outcome": "Answer two spoken identity and action micro-turns.",
  "cards": [
    {
      "slide_id": "3-9.1",
      "interaction_type": "dialogue-cue",
      "stage": "Learn",
      "prompt": "What is your name? My name is Liam.",
      "spanish_translation": "¿Cómo te llamas? Mi nombre es Liam.",
      "correct_option_id": "liam-greeting",
      "options": [
        { "id": "liam-greeting", "label": "My name is Liam.", "image_url": "/lesson-assets/a1_u3_review_liam.webp" }
      ],
      "audio_text": "What is your name? My name is Liam."
    },
    {
      "slide_id": "3-9.2",
      "interaction_type": "speak-microturn",
      "stage": "Speak",
      "prompt": "I am a teacher.",
      "spanish_translation": "Di tu profesión en voz alta.",
      "correct_option_id": "speak-teacher",
      "options": [
        { "id": "speak-teacher", "label": "I am a teacher." }
      ],
      "audio_text": "I am a teacher."
    },
    {
      "slide_id": "3-9.3",
      "interaction_type": "hotspot-identify",
      "stage": "Recognize",
      "prompt": "She has a phone.",
      "spanish_translation": "Toca a la persona que tiene el teléfono.",
      "correct_option_id": "sister-phone",
      "options": [
        { "id": "sister-phone", "label": "She has a phone.", "image_url": "/lesson-assets/a1_u3_review_phone.webp" },
        { "id": "brother-book", "label": "He has a book.", "image_url": "/lesson-assets/a1_u3_review_book.webp" }
      ],
      "audio_text": "She has a phone."
    },
    {
      "slide_id": "3-9.4",
      "interaction_type": "sequence-memory",
      "stage": "Use",
      "prompt": "Who is cooking? The sister is cooking.",
      "spanish_translation": "¿Quién está cocinando?",
      "correct_option_id": "sister-cooking",
      "options": [
        { "id": "sister-cooking", "label": "The sister is cooking.", "image_url": "/lesson-assets/a1_u3_review_cooking.webp" },
        { "id": "brother-playing", "label": "The brother is playing.", "image_url": "/lesson-assets/a1_u3_review_playing.webp" }
      ],
      "audio_text": "Who is cooking? The sister is cooking."
    }
  ]
}
```

---

## 6. Unit 3: Capstone Mission (Lesson 3.10) YAML Skeleton

File: `backend/lessons/unit_3/lesson-3-10-introduction-mission.yaml`

```json
{
  "id": "lesson-3-10-introduction-mission",
  "title": "3.10 Cenas cruzadas",
  "level": "Beginner A1",
  "unit_id": "unit-3",
  "unit_title": "Unit 3: Me and Other People",
  "unit_outcome": "Identify speakers, professions, roles, and actions during the dinner preparation.",
  "lesson_id": "lesson-3",
  "lesson_title": "Unit 3: Me and Other People",
  "sub_lesson_id": "3.10",
  "sub_lesson_title": "Cenas cruzadas",
  "experience_type": "mission",
  "content_revision": 1,
  "mission": {
    "label": "MISIÓN FINAL · UNIDAD 3",
    "title": "Cenas cruzadas",
    "briefing": "Ayuda a preparar la cena familiar escuchando las instrucciones. Descubre quién está cocinando, quién está hablando por teléfono y quiénes son los invitados especiales.",
    "kickoff_image_url": "/lesson-assets/a1_u3_mission_kickoff.webp",
    "objectives": [
      "Escucha y ubica a cada ayudante en la cocina",
      "Identifica quién responde y qué tiene",
      "Completa las presentaciones familiares"
    ],
    "completion_title": "¡Cena servida y familia presentada!",
    "completion_message": "Seguiste las instrucciones, descubriste las profesiones y roles, y presentaste a todos en inglés.",
    "chapters": [
      { "id": "ch1-kitchen-prep", "title": "Preparación en la cocina", "objective": "Identifica quién cocina y quién ayuda." },
      { "id": "ch2-who-responds", "title": "¿Quién responde?", "objective": "Asocia la acción y la frase correcta a cada persona." },
      { "id": "ch3-dinner-introductions", "title": "Presentaciones en la mesa", "objective": "Responde las preguntas de identidad en voz alta." }
    ]
  },
  "goal": "Identify helpers, professions, and possessions in the dinner scene and speak introductions.",
  "vocabulary": [],
  "review_vocabulary": [
    "cooking", "playing", "teacher", "doctor", "phone", "tea", "sister", "brother", "father", "mother", "have", "has"
  ],
  "grammar_function": "Integrate third-person present continuous and personal role questions (Who is he/she?).",
  "prerequisite": "Lessons 3.1-3.9 completed.",
  "speaking_outcome": "Complete dinner introductions aloud across final voice challenge gates.",
  "cards": [
    {
      "slide_id": "M01",
      "mission_chapter_id": "ch1-kitchen-prep",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The sister is cooking. The brother is playing.",
      "correct_option_id": "target-sister-cooking",
      "correct_option_ids": [
        "target-sister-cooking",
        "target-brother-playing"
      ],
      "options": [
        { "id": "target-sister-cooking", "label": "The sister is cooking." },
        { "id": "target-brother-playing", "label": "The brother is playing." }
      ],
      "audio_text": "The sister is cooking. The brother is playing.",
      "prompt_image_url": "/lesson-assets/a1_u3_scene_01_kitchen.webp",
      "audio_turns": [
        {
          "text": "The sister is cooking.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u3_scene_01_kitchen.webp"
        },
        {
          "text": "The brother is playing.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u3_scene_01_kitchen.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Escucha y toca a las personas en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-sister-cooking",
            "label_es": "Hermana cocinando",
            "rect": { "x": 0.15, "y": 0.35, "width": 0.22, "height": 0.50 },
            "accepted_option_ids": ["target-sister-cooking"],
            "head_anchors": [{ "x": 0.26, "y": 0.22 }]
          },
          {
            "id": "target-brother-playing",
            "label_es": "Hermano jugando",
            "rect": { "x": 0.60, "y": 0.45, "width": 0.20, "height": 0.40 },
            "accepted_option_ids": ["target-brother-playing"],
            "head_anchors": [{ "x": 0.70, "y": 0.32 }]
          }
        ],
        "cues": [
          {
            "id": "cue-sister-cooking",
            "text": "The sister is cooking.",
            "answer_text": "The sister is cooking.",
            "target_id": "target-sister-cooking",
            "option_id": "target-sister-cooking"
          },
          {
            "id": "cue-brother-playing",
            "text": "The brother is playing.",
            "answer_text": "The brother is playing.",
            "target_id": "target-brother-playing",
            "option_id": "target-brother-playing"
          }
        ]
      }
    },
    {
      "slide_id": "M02",
      "mission_chapter_id": "ch2-who-responds",
      "interaction_type": "mission-game",
      "stage": "Listen",
      "prompt": "The mother is talking on the phone. The father is reading.",
      "correct_option_id": "target-mother-phone",
      "correct_option_ids": [
        "target-mother-phone",
        "target-father-reading"
      ],
      "options": [
        { "id": "target-mother-phone", "label": "The mother is talking on the phone." },
        { "id": "target-father-reading", "label": "The father is reading." }
      ],
      "audio_text": "The mother is talking on the phone. The father is reading.",
      "prompt_image_url": "/lesson-assets/a1_u3_scene_02_dining.webp",
      "audio_turns": [
        {
          "text": "The mother is talking on the phone.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u3_scene_02_dining.webp"
        },
        {
          "text": "The father is reading.",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u3_scene_02_dining.webp"
        }
      ],
      "mission_game": {
        "kind": "guided-search",
        "instruction_es": "Escucha y toca a las personas en orden.",
        "validation": "ordered",
        "targets": [
          {
            "id": "target-mother-phone",
            "label_es": "Madre al teléfono",
            "rect": { "x": 0.28, "y": 0.30, "width": 0.20, "height": 0.55 },
            "accepted_option_ids": ["target-mother-phone"],
            "head_anchors": [{ "x": 0.38, "y": 0.18 }]
          },
          {
            "id": "target-father-reading",
            "label_es": "Padre sentado",
            "rect": { "x": 0.65, "y": 0.40, "width": 0.22, "height": 0.45 },
            "accepted_option_ids": ["target-father-reading"],
            "head_anchors": [{ "x": 0.76, "y": 0.28 }]
          }
        ],
        "cues": [
          {
            "id": "cue-mother-phone",
            "text": "The mother is talking on the phone.",
            "answer_text": "The mother is talking on the phone.",
            "target_id": "target-mother-phone",
            "option_id": "target-mother-phone"
          },
          {
            "id": "cue-father-reading",
            "text": "The father is reading.",
            "answer_text": "The father is reading.",
            "target_id": "target-father-reading",
            "option_id": "target-father-reading"
          }
        ]
      }
    },
    {
      "slide_id": "M03",
      "mission_chapter_id": "ch3-dinner-introductions",
      "interaction_type": "mission-game",
      "stage": "Speak",
      "prompt": "Who is she? She is the mother. She is a doctor.",
      "correct_option_id": "voice-mother-doctor",
      "options": [
        { "id": "voice-mother-doctor", "label": "She is the mother. She is a doctor." }
      ],
      "audio_text": "Who is she?",
      "prompt_image_url": "/lesson-assets/a1_u3_scene_03_photo_mother.webp",
      "audio_turns": [
        {
          "text": "Who is she?",
          "speaker_role": "teacher",
          "image_url": "/lesson-assets/a1_u3_scene_03_photo_mother.webp"
        }
      ],
      "mission_game": {
        "kind": "voice-gate",
        "instruction_es": "Escucha la pregunta y lee la respuesta en voz alta.",
        "validation": "single",
        "targets": [
          {
            "id": "target-voice-gate-mother",
            "label_es": "Presentación 1",
            "rect": { "x": 0.35, "y": 0.25, "width": 0.30, "height": 0.60 },
            "accepted_option_ids": ["voice-mother-doctor"],
            "head_anchors": [{ "x": 0.50, "y": 0.18 }]
          }
        ],
        "cues": [
          {
            "id": "cue-voice-mother",
            "text": "She is the mother. She is a doctor.",
            "answer_text": "She is the mother. She is a doctor.",
            "target_id": "target-voice-gate-mother",
            "option_id": "voice-mother-doctor"
          }
        ]
      }
    }
  ]
}
```

---

## 7. Media Manifest (Units 2 & 3)

| Unit | Scene ID | Filename (1536x1024 3:2) | Subject & Composition | Portrait Head $(x, y)$ | Landscape Head $(x, y)$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **U2** | `u2-park-kickoff` | `a1_u2_mission_kickoff.webp` | Park vista, Liam waving at entrance | `(0.50, 0.30)` | `(0.50, 0.30)` |
| **U2** | `u2-park-01` | `a1_u2_scene_01_park_path.webp` | Father running (L), Mother reading on grass (R) | `(0.21, 0.28)`, `(0.74, 0.32)` | `(0.21, 0.28)`, `(0.74, 0.32)` |
| **U2** | `u2-park-02` | `a1_u2_scene_02_bench.webp` | Girl sitting on green bench (L), Boy eating (R) | `(0.33, 0.36)`, `(0.66, 0.34)` | `(0.33, 0.36)`, `(0.66, 0.34)` |
| **U2** | `u2-park-03` | `a1_u2_scene_03_bus_stop.webp` | Green city bus at stop (L), three red bags on bench (R) | `(0.30, 0.15)`, `(0.72, 0.52)` | `(0.30, 0.15)`, `(0.72, 0.52)` |
| **U2** | `u2-park-04` | `a1_u2_scene_04_parents.webp` | Parents standing talking (L), Grandparents walking (R) | `(0.28, 0.22)`, `(0.44, 0.24)` | Chest: `(0.36, 0.38)` |
| **U2** | `u2-park-05` | `a1_u2_scene_05_photo_father.webp` | Close-up guest shot: Father smiling in park | `(0.50, 0.18)` | `(0.50, 0.18)` |
| **U3** | `u3-dinner-kickoff` | `a1_u3_mission_kickoff.webp` | Family home entrance, dining table visible | `(0.50, 0.32)` | `(0.50, 0.32)` |
| **U3** | `u3-kitchen-01` | `a1_u3_scene_01_kitchen.webp` | Sister stirring cooking pot (L), Brother playing cards (R) | `(0.26, 0.22)`, `(0.70, 0.32)` | `(0.26, 0.22)`, `(0.70, 0.32)` |
| **U3** | `u3-dining-02` | `a1_u3_scene_02_dining.webp` | Mother on smartphone (L), Father at table reading (R) | `(0.38, 0.18)`, `(0.76, 0.28)` | `(0.38, 0.18)`, `(0.76, 0.28)` |
| **U3** | `u3-photo-03` | `a1_u3_scene_03_photo_mother.webp` | Medium close-up: Mother with stethoscope/doctor badge | `(0.50, 0.18)` | `(0.50, 0.18)` |

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
