// A tyre compound on a softness scale, where the maker's word says it clearly. Anything else (Shore numbers,
// "Sport", "Gekko", "Advanced X2S3") has no place on the scale and is listed under the maker's own name.
export const SOFTNESS = ['Ultra soft', 'Super soft', 'Soft', 'Medium soft', 'Medium', 'Medium hard', 'Hard', 'Wet'] as const;
const WORDS: Record<string, (typeof SOFTNESS)[number]> = {
  'ultra soft': 'Ultra soft', ultrasoft: 'Ultra soft', xxsoft: 'Ultra soft', 'xx soft': 'Ultra soft',
  'super soft': 'Super soft', supersoft: 'Super soft', 'extra soft': 'Super soft', extrasoft: 'Super soft', xsoft: 'Super soft', 'x soft': 'Super soft',
  soft: 'Soft', 'medium soft': 'Medium soft', softmedium: 'Medium soft', 'soft medium': 'Medium soft',
  medium: 'Medium', 'medium hard': 'Medium hard', mediumhard: 'Medium hard', 'medium firm': 'Medium hard', hard: 'Hard', firm: 'Hard',
  rain: 'Wet', wet: 'Wet', damp: 'Wet', 'super soft rain': 'Wet', 'soft rain': 'Wet',
};
/** The softness step for a maker's compound word, or undefined when it does not map clearly. */
export function softness(compound: string): (typeof SOFTNESS)[number] | undefined {
  let s = compound.toLowerCase().replace(/\blong wear\b|\brock\b/g, ' ').replace(/\bclay\b/g, ' ').replace(/^[a-z]{1,2}\d+\s+/, '').replace(/\s+/g, ' ').trim();
  if (s === '' && /clay/i.test(compound)) return undefined;   // plain "Clay" names a track surface, not a softness
  return WORDS[s];
}
