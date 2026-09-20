# Contextual avatar help verification — 2026-09-20

The `?` control and four-second idle trigger share the avatar popup and the existing current-card help resolver on mobile and web. `No mostrar` saves the automatic-help opt-out and replaces the message with the reminder and `?` icon. Its `Entiendo` button closes the reminder; manual help remains available.

Verified:

- The production shared hook opens at 4,000 ms, resets after interaction, waits during held touches/drags and unavailable response states, cancels stale card timers, and does not auto-close or repeat on an acknowledged card.
- Opt-out survives remount, manual help still opens, and a late storage read cannot undo a new opt-out.
- Native Yoga: 320×568, 390×844, 667×320, 844×390, 800×1280 and 1280×800, at font scales 1, 1.3 and 2. The long construction explanation and reminder retain reachable 48dp buttons inside safe areas.
- Browser: real LessonPlayer with canonical Lesson 1.7 construction and Lesson 1.1 R2 recognition cards. The contextual popup opens manually and on idle. The two-step opt-out works, storage contains the opt-out, manual help reopens, and the placed `She` tile survives dismissal. Popup screenshots inspected at 390×844 and 667×320. Temporary local verification route removed.
- Backend: 365 tests passed. Frontend: 18 tests and production build passed. Mobile: complete Preview preflight passed, including course integrity, interaction suites, TypeScript and Android export.

Device follow-up in the exact published Preview: repeat both triggers, opt out, acknowledge the reminder, navigate to another slide, and reopen help. Check portrait/landscape rotation and TalkBack/VoiceOver focus on an installed device. Browser and Yoga evidence do not replace installed Android/iOS validation.

