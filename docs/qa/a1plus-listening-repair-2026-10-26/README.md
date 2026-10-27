# Ordinary listening and Engine QA repair

The reported 1.1-A03 card asked the learner to select a meeting proposal from work/arrival facts under the ordinary listening instruction. Spanish prose supplied the meeting premises. It now plays the already approved exact recording “Let's meet at seven.” against the unchanged six/seven alternatives. The extra Spanish paragraph is removed.

Across the 11 ordinary lessons, 94 Listen cards lose the Spanish scenario paragraph. Twenty-four question/proposal cards now use their exact approved spoken question/proposal as the listening evidence. One frequency card, 1.6-A04, includes the existing “I study every day.” recording so its answer no longer requires remembering the preceding card. Direct fact, reporting, temporal-order and spoken-question comprehension remains. The mission, lesson/card identities, 433-card count, all non-Listen cards and all 85 A1 lessons are preserved.

`content-changes.json` records every affected card's English evidence, alternatives and answer. The source is `progression-v11-self-contained-listening`, hash `82e57e2a6e07b49d19cb297ed0878a215132d256be564db30a4fea7c266f004d`. `reused-audio-bindings.json` records 27 new bindings to previously user-approved exact recordings; no new speech or images were generated. Image review remains pending and existing human audio approvals remain attached to their unchanged bytes.

Engine QA now has named A1/A1+ course tabs before unit selection. Its regression opens all twelve A1+ lessons, returns to A1's seven units, and restores the reported listening card from saved QA location. The course name comes from the registered catalog, with no A1+-specific branch.

Shared compiler admission and installed-course validation reject Spanish scenario paragraphs on ordinary Listen cards and reject unheard question/proposal alternatives. Runtime feedback distinguishes a heard-question contrast from a missing-information decision. Tests exercise the installed catalog as well as historical fixtures and preserve all 2,369 pinned A1 wrong-answer explanations.

Local verification before release: authoring/installed content validation, 21 focused backend tests, TypeScript, QA navigation/catalog parity, 9 feedback tests, 16 mission/playback regressions, and independent delivery fidelity (433 cards, 691 ordered audio bindings, 83 images) passed. Protected complete-candidate CI and exact-main Preview publication remain the release gates; a local package is not publication evidence.
