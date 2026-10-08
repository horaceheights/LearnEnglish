import { Text } from 'react-native';
import { NEW_VOCABULARY_COLOR, vocabularyParts } from '../lessonVocabulary';
/** Inline spans inherit layout and font size. Assessment colors retain priority. */
export function vocabularyText(text: string, vocabulary: readonly string[], disabled = false) {
  if (disabled) return text;
  return vocabularyParts(text, vocabulary).map((part, index) => part.highlighted
    ? <Text key={index} style={{ color: NEW_VOCABULARY_COLOR, fontWeight: '900' }}>{part.text}</Text>
    : part.text);
}
