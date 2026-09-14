// Mirrored on web. Presentation follows authored mission state, never beat offsets.
function missionVoiceProgress(lesson, cardIndex) {
  const cards = lesson?.cards || [];
  const card = cards[cardIndex];
  if (card?.mission_game?.kind !== 'voice-gate') return null;
  const gates = cards.flatMap((item, index) => item.mission_game?.kind === 'voice-gate' ? [index] : []);
  return {
    question: card.mission_game.cue_audio_text || card.mission_game.cues?.[0]?.text || '',
    step: gates.indexOf(cardIndex) + 1,
    total: gates.length,
    heading: lesson.mission?.voice_heading || 'ABRE LA CELEBRACIÓN',
    instruction: lesson.mission?.voice_instruction || 'Activa la entrada con tu voz',
    successLabel: lesson.mission?.voice_success_label || 'ENTRADA ACTIVADA',
  };
}

function missionChallengeLabel(game) {
  if (game?.kind === 'guided-search') {
    return game.tutorial_mode === 'guided-no-fail' ? 'PRIMER RETO' : 'ESCUCHA Y ENCUENTRA';
  }
  return {
    'action-hunt': 'ENCUENTRA LA ACCIÓN',
    'contrast-hunt': 'MIRA BIEN',
    'crowd-search': 'ENCUENTRA A LA PERSONA',
    'family-link': 'REÚNE A LA FAMILIA',
    'voice-gate': 'RETO DE VOZ',
  }[game?.kind] || 'ESCUCHA Y ENCUENTRA';
}

function missionFinale(lesson) {
  const card = lesson?.cards?.at(-1);
  const correct = card?.options?.find(option => option.id === card.correct_option_id);
  return {
    imageUrl: correct?.image_url || card?.prompt_image_url || '',
    phrase: card?.prompt || '',
  };
}

module.exports = { missionVoiceProgress, missionChallengeLabel, missionFinale };
