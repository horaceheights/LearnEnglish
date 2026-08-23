import type { AudioSource } from 'expo-audio';

import {
  courseAudioUrl,
  type CourseAudioProvider,
  type CourseAudioVoice,
} from './config';

// Completion blanks are assembled from exact speech fragments and encoded silence.
// Literal requires keep them inside the OTA instead of sending placeholders to TTS.
const BUNDLED_COMPLETION_PROMPTS: Record<string, AudioSource> = {
  '{blank}': require('../assets/course-audio/completion-prompts/c1a04eff47559ddbd5089f3dbf8653772381be67172137091c45965780059fff.mp3'),
  '{blank} are reading.': require('../assets/course-audio/completion-prompts/dbbf897b17d958d764adefd6fc3f49b20d2c9def8e102a4dd16abdeef8d5a5d4.mp3'),
  '{blank} blue cars': require('../assets/course-audio/completion-prompts/ba5da7c1ed93f119da9796e851e08f038d2f0df40bfc93169731b60ec866c3eb.mp3'),
  '{blank} green books': require('../assets/course-audio/completion-prompts/4cb6666959e82c7eebbdea58bb9fe6d3afc46b063e489f01014cd3fd2fb6e2e2.mp3'),
  '{blank} is a bag.': require('../assets/course-audio/completion-prompts/f70f27090b43d18e79dbd0998df9aada89bb297d0badc562a209daa4764e6dc5.mp3'),
  '{blank} is a book.': require('../assets/course-audio/completion-prompts/f186b6edd9ea71f32ca3fc5136889d0c19788ef3bf4e44d9482463dc802e3e9a.mp3'),
  '{blank} is a chair.': require('../assets/course-audio/completion-prompts/7d59257e0957ec713d339a49b171967e6862544f1b1b6dc3475468891517824a.mp3'),
  '{blank} is a house.': require('../assets/course-audio/completion-prompts/d7d5d8958b21f2db9d51ac77f502eaf87c68a0659b05af2bc79a3f73ff1f3284.mp3'),
  '{blank} is a phone.': require('../assets/course-audio/completion-prompts/247c794521ba6d7e33e31652160132551060c568f37fb6ceb8b4905b207192a1.mp3'),
  '{blank} is a school.': require('../assets/course-audio/completion-prompts/f44fbcbcfb9905e500ecbce0119a4bd389d1e360522bf206b81635943eaa9cfe.mp3'),
  '{blank} is a store.': require('../assets/course-audio/completion-prompts/fb0dfc0f9156f15876e41412adeffaf06d1a2ea74ab258c2522a1d7e34187fc4.mp3'),
  '{blank} is it?': require('../assets/course-audio/completion-prompts/75a75f905f67e379999a7853ae9e543c5797235ca2e950d373911ff194ab9853.mp3'),
  '{blank} yellow pens': require('../assets/course-audio/completion-prompts/eee75d6e670ec951605442c43410e11df82d084e33e037cda599cc7ddec3d3b5.mp3'),
  'A {blank}': require('../assets/course-audio/completion-prompts/595b39351049be5d927856d4867950fbd37e584f22fd6add947826ab69564978.mp3'),
  'A brother is {blank}': require('../assets/course-audio/completion-prompts/fdf107ac9ee839f31733536a6d58c85161c584a5fb414b6994c371f455197498.mp3'),
  'Five black {blank}': require('../assets/course-audio/completion-prompts/e088e52349fe23c30871a9a47a0d9e85a28e8deecb14630d6501bd840f62a224.mp3'),
  'Four yellow {blank}': require('../assets/course-audio/completion-prompts/94c15e0f22f311086fec9645f8f09f13fc261b52ce530e7e8496df5447abccd0.mp3'),
  'He {blank} working.': require('../assets/course-audio/completion-prompts/974d380257a269d5351f952917d4c9b5feead4a39315a0932db3d54995d7c083.mp3'),
  'He is {blank}': require('../assets/course-audio/completion-prompts/cb7a524196013693eef98ff1b97e8610c8c8b3c5a0fb6784e596bdb270dfefe4.mp3'),
  'He is the {blank}': require('../assets/course-audio/completion-prompts/9363bd842018cdfb65519e64665cd967f37760b43584e7c8a2c0129a495d4e0c.mp3'),
  'It {blank} a store.': require('../assets/course-audio/completion-prompts/d9709127a6b98d63e5b07eb0e550b53d8fd225674f6f0c9c9ce8d0b30b903775.mp3'),
  'It is {blank}': require('../assets/course-audio/completion-prompts/5611ba956970adfd3a7e4ac6057f5de12afe7520c38d809c393fde353f75d598.mp3'),
  'It is a {blank}': require('../assets/course-audio/completion-prompts/6ab414aa41df82327ce343bef36183a1868d0b13e692e27735817f90c8f75f37.mp3'),
  'One {blank} car': require('../assets/course-audio/completion-prompts/59ff2fc5515f4c112d5050149a7ba6d6352cc9a8ddbdc0d8c5a381eab7d2fe11.mp3'),
  'One red {blank}': require('../assets/course-audio/completion-prompts/fde6b0f83db816bcc4f5b88f8aa76c73a744e3d1675de700ee24f027dc8ccee8.mp3'),
  'She is {blank}': require('../assets/course-audio/completion-prompts/2e4dee6412334a3e801067cea236cfe2d6451a165eee41a36a7685b0ca2e4425.mp3'),
  'She is {blank} working.': require('../assets/course-audio/completion-prompts/b7ca896f83a9931419f0d641e66262d0d586fd2d2f4c8253e316bfd50367587e.mp3'),
  'She is the {blank}': require('../assets/course-audio/completion-prompts/f0bf6353c073a62da47c89c5318030091ed97af5bec553bc2c5c479df3fcb8f8.mp3'),
  'That {blank} a chair.': require('../assets/course-audio/completion-prompts/d15b5be57b834f0ba67c1baee7b1bc83d377067c21ca3dcddcad37b932059e04.mp3'),
  'The baby {blank} sleeping.': require('../assets/course-audio/completion-prompts/9594965c35018aacf8d99bbe25ca0ed3f32f2ed76819a2a799acad61097503af.mp3'),
  'The boy {blank} the girl are running.': require('../assets/course-audio/completion-prompts/41eaef37fff8cd8b14de139823bcd42a5369f490f357737bbc33d348b664f4e3.mp3'),
  'The boy and the girl {blank} running.': require('../assets/course-audio/completion-prompts/90e885e0fa50ca9e9175049e31e365a5ffc91701165edd4a616a6421c9980484.mp3'),
  'The boy is a {blank}': require('../assets/course-audio/completion-prompts/b037ebbf221f961f510d32979a0c1e3d351f566a4fa7b5c8f5624c9ed279faf0.mp3'),
  'The children {blank} studying.': require('../assets/course-audio/completion-prompts/dddea1e5339e96bcef6ff32d322f4307a6854ea03ab9df2237e1c4ad0429d971.mp3'),
  'The children are {blank}': require('../assets/course-audio/completion-prompts/8be9d05271882a9a5ce3927628e5b000bf4899e5a0821a2bff3b12d4478803a4.mp3'),
  'The father {blank} cooking.': require('../assets/course-audio/completion-prompts/14bc9c606dd9fa121e73d69a17ffdb6f6b0437c44ea33e864553ede42f214d28.mp3'),
  'The father is {blank}': require('../assets/course-audio/completion-prompts/3ba4cb585b0f01d12cad34e661e93d25536d01f1a8d18262b229b6252c82731d.mp3'),
  'The girl {blank} walking.': require('../assets/course-audio/completion-prompts/40d6e657011136204c396ed934f9080d2cc7b3642825e142e2cc49e5d12991c1.mp3'),
  'The girl is {blank}': require('../assets/course-audio/completion-prompts/75dca3e8c60310fb262f7ebd57b5bd1010d95246bb79f708a4221dc482807e46.mp3'),
  'The grandparents {blank} talking.': require('../assets/course-audio/completion-prompts/eae1de8d3892cdcaf8d90f3c304f72fa58d049de18e515a9943d9fc70b322f3a.mp3'),
  'The mother is {blank}': require('../assets/course-audio/completion-prompts/3e3ab364cf9a8c19bcdcb4e183a89140dff24b33942cddf847cd8e1bd02704a7.mp3'),
  'The parents {blank} talking.': require('../assets/course-audio/completion-prompts/153395044a9239d28430d45a2e39ee02ceff1ab43401b8e70c5f5dafe2384697.mp3'),
  'The parents are {blank}': require('../assets/course-audio/completion-prompts/81a594944959399f294b8ff151659f25e23ebf8e821bb212dac4ecbf1308469a.mp3'),
  'They {blank} playing.': require('../assets/course-audio/completion-prompts/5fdd1186449cf3782289055f24fc3232d7aa698a48cb157b480ff2ab6d53b6ef.mp3'),
  'They {blank} reading.': require('../assets/course-audio/completion-prompts/6c11b0803c0ddb4f702c5d84639dcbdaecdc230e5f81e65dc2ee7d7f99d0da0a.mp3'),
  'They {blank} writing.': require('../assets/course-audio/completion-prompts/983051f2b026d952eeeb09623370159ec971d01597016024ae1490c6e90abdf3.mp3'),
  'They are {blank}': require('../assets/course-audio/completion-prompts/52dfefdde74ba39d4da9bf3d4a067685a01b31310230a8639b972b5479341e83.mp3'),
  'They are {blank} sitting.': require('../assets/course-audio/completion-prompts/bed0d43aceb0984e9716087f3e4528f7032fa16c57a83ac229552cca72900eed.mp3'),
  'They are {blank} sleeping.': require('../assets/course-audio/completion-prompts/025068aadec3232a18f76dd8a58ad293ea33277ba30679aeb7d5442189d00d91.mp3'),
  'They are a {blank}': require('../assets/course-audio/completion-prompts/386f215e292aa30a40085d8042bb7e08191877a2b2ff5bd62cd6b35d15c6d96b.mp3'),
  'They are the {blank}': require('../assets/course-audio/completion-prompts/d8d05f795dd0a39978946c643a1dbd7a8d59c97d264cefcd4761050c3591c52a.mp3'),
  'This {blank} a bag.': require('../assets/course-audio/completion-prompts/1a8e452fbf8d2b9ece1a514c92c5a48752c010357776d800e3e17274bda622f0.mp3'),
  'Three {blank} books': require('../assets/course-audio/completion-prompts/a4d8e9211fa9bfb0de33d6fa8b677ebd40b04ed564d79033085212d2b4833f8e.mp3'),
  'Three green {blank}': require('../assets/course-audio/completion-prompts/0dfa22cd2bde2adbdb96a6ec332c1db62cc3484e6b047df0e886ac8f862c47c6.mp3'),
  'Two {blank} cars': require('../assets/course-audio/completion-prompts/c8dcb4103dad41a8b9445edcbbddc68029804cac09d0708854efe9646eac9c5e.mp3'),
  'Two blue {blank}': require('../assets/course-audio/completion-prompts/c92434cb68a4d682c3d7e8e3d255cc793dbcad68aac046780d8c3f26db585a13.mp3'),
  'What {blank} it?': require('../assets/course-audio/completion-prompts/f1c7ff1f452d3a761f07977b86e4f41f19fca6c28054836ab68ff57488fe30db.mp3'),
  'What is {blank}': require('../assets/course-audio/completion-prompts/6d3753bbb52389e1326a9805e2a3a6481465cf1528c83b874419ac363959163d.mp3'),
  'Who {blank} he?': require('../assets/course-audio/completion-prompts/e5d1e7893d7090f1b3bcc9ed2e3e8f3dfe48f268d9168da4f00f58ff084ccd0c.mp3'),
  'Who {blank} she?': require('../assets/course-audio/completion-prompts/07b4e2f872ba502717cfa751d127410bf7d3f29cb6eda9f71a1db4d9ca727e68.mp3'),
  'Who {blank} they?': require('../assets/course-audio/completion-prompts/137244a0c9589568b2e1147fd461c67576122d580a9c980efdaec37142239596.mp3'),
};

const SILENT_COMPLETION_PROMPT = BUNDLED_COMPLETION_PROMPTS['{blank}'];

export function hasVisualAudioPlaceholder(text: string): boolean {
  return /_+|\.{3}|…|\{blank\}/.test(String(text || ''));
}

export function completionPromptKey(text: string): string {
  return String(text || '')
    .replace(/\s*_{2,}\s*[.,!?]?/g, ' {blank} ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function courseAudioSource(
  text: string,
  mode = 'prompt',
  variant = 'default',
  provider: CourseAudioProvider = 'openai',
  narrator: CourseAudioVoice = 'female-teacher',
): AudioSource {
  if (hasVisualAudioPlaceholder(text)) {
    return BUNDLED_COMPLETION_PROMPTS[completionPromptKey(text)] ?? SILENT_COMPLETION_PROMPT;
  }
  return courseAudioUrl(text, mode, variant, provider, narrator);
}
