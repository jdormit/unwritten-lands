// ============================================================
// Theme Seeds for Pre-Worldbuilding Diversity
// ============================================================
//
// These three lists are randomly sampled (one from each) and passed
// to the theme-generation LLM call. The combinatorial variety
// (15 x 15 x 20 = 4,500 unique combos) ensures that successive
// playthroughs feel genuinely different.
//
// Sources:
//   Terrain  – WWF terrestrial biome classifications, One Earth
//              Bioregions Framework, real geological formations
//              (tepuis, altiplano, karst, wadis, ergs, etc.)
//   Culture  – Reddit r/worldbuilding threads on underrepresented
//              cultures, Britannica pre-Columbian civilizations,
//              UNESCO Central Asian civilizations volumes, African
//              kingdoms research
//   Mythic   – Stith Thompson Motif-Index of Folk Literature
//              (categories A–Z), Joseph Campbell's monomyth,
//              comparative mythology (creation, flood, trickster,
//              ancestor spirits, cosmic cycles, dying-and-rising
//              gods)
// ============================================================

/** Physical landscape and terrain. */
export const TERRAIN_SEEDS = [
  "Wind-scoured high-altitude desert plateau ringed by volcanic peaks",
  "Dense subtropical jungle split by a slow, wide river system",
  "Rolling steppe grasslands stretching to the horizon, broken by granite outcrops",
  "Frozen tundra pocked with thermal springs and steam vents",
  "Terraced canyon lands carved by ancient rivers, now arid and layered in red stone",
  "Seasonally flooded river delta, rich with silt and wading birds",
  "Towering flat-topped sandstone mesas rising above dense cloud forest",
  "Vast savanna dotted with massive ancient trees and seasonal watering holes",
  "Labyrinthine peat bogs and black-water channels through ancient forest",
  "Salt flats shimmering between dormant volcanic ridges",
  "Jagged limestone karst towers rising from a misty forested basin",
  "Alpine meadows above a vast glacial valley with milky blue lakes",
  "Endless taiga forest broken by frozen lakes and winding rivers",
  "Dry scrubland hills dotted with ancient stone ruins and wild olive groves",
  "Chain of volcanic islands with black sand beaches and dense cloud forest",
] as const;

/** Blended cultural inspirations (always two sources). */
export const CULTURE_SEEDS = [
  "Saharan Tuareg caravan traders and Ethiopian Aksumite highland kingdom",
  "Amazonian Yanomami deep-forest dwellers and Khmer Empire temple-builders",
  "Inuit arctic sea-hunters and Siberian Evenki reindeer-herding nomads",
  "Ancestral Puebloan cliff-dwelling farmers and Nabataean rock-carved city traders",
  "Mongolian steppe horse-empire and Sámi arctic reindeer herders",
  "West African Yoruba city-state religion and Mississippian mound-builder civilization",
  "Mapuche mountain warriors and Balkan highland clans",
  "Swahili coast trading cities and Polynesian open-ocean wayfinding culture",
  "Mesoamerican Zapotec mountain city-states and Caucasian Georgian fortress culture",
  "Tibetan Buddhist highland monasticism and Andean Quechua high-altitude empire",
  "Bengali river-delta monsoon farmers and Norse seafaring raider-settlers",
  "Hmong highland terrace-farmers and Aboriginal Australian deep-time oral tradition",
  "Berber desert pastoralists and Central Asian Kazakh oral poetry tradition",
  "Tairona mountain-forest city-builders and Japanese Ainu northern hunter-spiritualists",
  "Khoekhoe Southern African pastoralists and Ottoman multi-ethnic frontier culture",
] as const;

/** Mythic mood and narrative tension. */
export const MYTHIC_TONE_SEEDS = [
  "Ancestor spirits walk among the living and demand to be honored",
  "The land itself is alive and its moods shape daily life — droughts are anger, floods are grief",
  "Two rival spiritual traditions compete for the people's devotion",
  "An ancient pact with a powerful spirit is coming due and the price may be too high",
  "The world is slowly dying — harvests shrink, animals vanish — and no one agrees on why",
  "A golden age has recently ended and the people are learning to survive in a diminished world",
  "A great migration is underway — the clan has left everything behind and must find a new home",
  "The boundary between the living and the dead is thin, and the dead do not always stay dead",
  "The gods have gone silent and the old rituals no longer work",
  "Something predatory and intelligent lurks at the edges of settled land",
  "A prophesied cycle of destruction and renewal is approaching its end phase",
  "The people are newly free from subjugation and building their own way for the first time",
  "A trickster figure has disrupted the cosmic order and reality is subtly wrong",
  "Sacred animals are disappearing, and with them the power they granted the people",
  "Twin forces — one creative, one destructive — are locked in a struggle that shapes all events",
  "A charismatic prophet has arisen among a neighboring people, drawing away converts",
  "The stars and seasons are shifting from their ancient patterns, unsettling all tradition",
  "An ancient wrong — a massacre, a betrayal, a broken oath — haunts the land and demands justice",
  "The people have discovered something powerful underground and disagree about whether to use it",
  "A great ruler has just died with no clear successor, and old alliances are fracturing",
] as const;

/** Pick a uniformly random element from an array. */
export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
