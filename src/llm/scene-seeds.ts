// ============================================================
// Scene Seeds for Event-Level Diversity
// ============================================================
//
// Three tables of abstract creative prompts, randomly sampled
// (one from each) and injected into Director prompts. The LLM
// interprets them freely to shape the dramatic texture of each
// event, breaking the model out of repetitive patterns while
// the storyline continuity system (active storylines, flags,
// event history) maintains narrative coherence.
//
// Combinatorial variety: 50 × 50 × 50 = 125,000 unique combos.
//
// Sources:
//   Situation – Georges Polti's 36 Dramatic Situations, Ronald
//              Tobias's 20 Master Plots, Stith Thompson's
//              Motif-Index of Folk Literature (categories C, H,
//              K, L, M, N, R), Aarne-Thompson-Uther tale type
//              index, Mythic GM Emulator Action meaning table
//   Tension  – Rushworth Kidder's 4 dilemma paradigms (truth
//              vs. loyalty, individual vs. community, short-term
//              vs. long-term, justice vs. mercy), literary
//              conflict taxonomy (person vs. self/nature/society/
//              supernatural), Christopher Booker's 7 basic plots
//              (tension elements), Polti's sacrifice and
//              judgment situations
//   Scope    – Sociological levels of analysis (micro/meso/
//              macro), interpersonal/intragroup/intergroup
//              conflict taxonomy, Thompson Motif-Index category
//              P (Society), Arnold van Gennep and Victor Turner's
//              rites of passage and liminality framework
// ============================================================

import { pickRandom } from "./theme-seeds";

/**
 * Dramatic catalysts — what is happening.
 * Abstract enough for creative interpretation, specific enough
 * to push the model away from default negotiation scenarios.
 */
export const SITUATION_SEEDS = [
  // Polti's 36 Dramatic Situations
  "A supplication ignored",                     // Polti #1
  "A deliverance with hidden cost",             // Polti #2
  "An old wrong demanding justice",             // Polti #3
  "Kin turned against kin",                     // Polti #13
  "A daring enterprise begun",                  // Polti #9
  "Something precious abducted",                // Polti #10
  "An enigma that divides",                     // Polti #11
  "A rival claiming what is yours",             // Polti #14
  "Madness or obsession taking hold",           // Polti #16
  "A fatal mistake discovered too late",        // Polti #17
  "Self-sacrifice for an ideal",                // Polti #20
  "Ambition overreaching its grasp",            // Polti #30
  "Defiance against a higher power",            // Polti #31
  "Remorse that demands action",                // Polti #34
  "A lost one found changed",                   // Polti #35

  // Tobias's 20 Master Plots
  "A pursuit with no clear quarry",             // Tobias: Pursuit
  "A rescue that may not be wanted",            // Tobias: Rescue
  "An escape from something invisible",         // Tobias: Escape
  "A riddle without safe answers",              // Tobias: Riddle
  "Temptation wearing a fair disguise",         // Tobias: Temptation
  "A transformation already underway",          // Tobias: Metamorphosis
  "Excess that can no longer be hidden",        // Tobias: Wretched Excess
  "A slow descent no one acknowledges",         // Tobias: Descension

  // Thompson Motif-Index
  "A tabu unknowingly broken",                  // Thompson C: Tabu
  "A test no one expected",                     // Thompson H: Tests
  "A deception slowly unraveling",              // Thompson K: Deceptions
  "Fortune suddenly reversed",                  // Thompson L: Reversals
  "A vow coming due",                           // Thompson M: Ordaining the Future
  "A chance discovery in a strange place",       // Thompson N: Chance and Fate
  "Something imprisoned breaking free",          // Thompson R: Captives
  "A cruelty revealed",                          // Thompson S: Unnatural Cruelty
  "A gift that transforms the receiver",         // Thompson D: Magic
  "The dead making a claim on the living",       // Thompson E: The Dead
  "Something monstrous in a familiar shape",     // Thompson G: Ogres

  // Mythic GME Action table
  "Something precious neglected too long",       // Mythic: Neglect
  "An arrival that changes everything",          // Mythic: Arrive
  "A usurper staking a claim",                   // Mythic: Usurp
  "A creation outgrowing its creator",           // Mythic: Create
  "A betrayal not yet spoken aloud",             // Mythic: Betray
  "An alliance fraying at the edges",            // Mythic: Separate
  "Something sealed now opened",                 // Mythic: Open
  "A celebration that reveals too much",         // Mythic: Celebrate
  "Ruin mistaken for renewal",                   // Mythic: Ruin
  "A return no one prepared for",                // Mythic: Return

  // ATU Tale Types
  "An animal behaving against its nature",       // ATU 1-299: Animal Tales
  "A bargain with something not human",          // ATU 300-749: Tales of Magic
  "A protector who has become the threat",        // Thompson K: Deceptions variant
  "An inheritance no one wants to claim",         // Polti #36 variant
  "Abundance where there should be none",         // Thompson N: Chance
  "A duty passed to the unprepared",              // Tobias: Maturation
] as const;

/**
 * Emotional and dramatic pressures — what makes it hard.
 * These shape the dilemma at the heart of the event's choices.
 */
export const TENSION_SEEDS = [
  // Kidder's 4 dilemma paradigms
  "Truth against loyalty",                       // Kidder #1
  "The one against the many",                    // Kidder #2
  "Present need versus future ruin",             // Kidder #3
  "Justice without mercy",                       // Kidder #4
  "Loyalty against conscience",                  // Kidder #1 variant
  "The group's good at the person's expense",    // Kidder #2 variant
  "A quick fix that poisons the well",           // Kidder #3 variant
  "Mercy that enables harm",                     // Kidder #4 variant

  // Literary conflict types
  "The self divided against itself",             // Person vs. Self
  "Nature indifferent to need",                  // Person vs. Nature
  "Society's weight on the few",                 // Person vs. Society
  "A force that cannot be reasoned with",        // Person vs. Supernatural
  "Custom strangling what must change",          // Person vs. Society variant
  "The body failing the will",                   // Person vs. Self variant
  "The land giving and taking in equal measure", // Person vs. Nature variant

  // Polti tension elements
  "A sacrifice no one wants to name",            // Polti #23
  "Jealousy built on a misunderstanding",        // Polti #32
  "Love for the one who is also the enemy",      // Polti #29
  "Duty to the dead constraining the living",    // Polti #21 variant
  "Gratitude becoming a cage",                   // Polti #15 variant
  "Obedience destroying what it protects",       // Polti #8 variant

  // Booker's 7 basic plots (tension elements)
  "Pride mistaken for principle",                // Tragedy
  "A monster that was once a friend",            // Overcoming the Monster
  "The journey revealing the wrong destination", // Voyage and Return
  "Rebirth requiring the death of the old",      // Rebirth
  "The goal achieved but the cost too high",     // Quest
  "Laughter concealing the wound",               // Comedy
  "A rise that isolates",                        // Rags to Riches

  // Mythic GME Subject table
  "Hope entangled with fear",                    // Mythic: Hope + Fears
  "Control slipping into dependence",            // Mythic: Control + Burden
  "Stalemate rotting from within",               // Mythic: Stalemate
  "Success breeding complacency",                // Mythic: Success
  "Power that corrupts its purpose",             // Mythic: Power
  "Rumors more dangerous than truth",            // Mythic: Rumor
  "Safety purchased with freedom",               // Mythic: Liberty
  "Abundance that attracts predators",           // Mythic: Opulence + Danger

  // Additional cross-source tensions
  "The helper who cannot be trusted",
  "Strength that terrifies allies",
  "Knowledge too dangerous to share",
  "Generosity that creates obligation",
  "The wound that won't heal cleanly",
  "Silence more threatening than words",
  "A promise that time has made impossible",
  "Two rights that cannot both be honored",
  "The cure that is also the poison",
  "What is sacred to one is profane to another",
  "The old way dying without a replacement",       // Booker: Rebirth variant
  "Compassion weaponized",                          // Kidder: mercy variant
  "An debt that grows the longer it's ignored",     // Kidder: short vs. long variant
  "The stranger who knows too much",                // Literary: person vs. unknown
] as const;

/**
 * Human scale — who is affected and how broadly.
 * Forces variety in the social scope of events, preventing
 * everything from defaulting to grand clan-level diplomacy.
 */
export const SCOPE_SEEDS = [
  // Micro: individual / dyadic
  "Between two people once close",               // Interpersonal
  "A single person bearing an impossible weight", // Intrapersonal
  "A private matter threatening to go public",    // Intrapersonal → group
  "Between mentor and student",                   // Dyadic role
  "Between two who share a secret",               // Dyadic bond
  "One person's choice shaping many fates",        // Individual → macro

  // Family / household
  "Within a single troubled family",              // Family micro
  "Between parent and child",                      // Family dyadic
  "Across a generation gap",                       // Family meso
  "Between siblings with unequal standing",        // Family rivalry
  "A household divided by belief",                 // Family intragroup

  // Intragroup: within the clan
  "Among those who serve without recognition",     // Thompson P: social orders
  "Between the experienced and the untested",      // Role-based
  "Among the young with no voice yet",             // Age-based
  "Between those who remember and those who don't", // Generational knowledge
  "Among those who do the dangerous work",          // Labor/risk
  "A rift among the clan's inner circle",           // Leadership intragroup
  "Between the devout and the doubting",            // Belief-based
  "Those at the margins of the community",          // Social periphery
  "Among those preparing for a rite of passage",    // Van Gennep: liminality
  "Between the healer and those beyond healing",    // Role-based

  // Intergroup: between clans / peoples
  "Between host and guest",                         // Thompson P: hospitality
  "Between the settled and the wandering",          // Cultural difference
  "Between former allies grown apart",              // Relationship decay
  "Between peoples who share a border",             // Territorial
  "Between trading partners with a grudge",         // Economic + relational
  "Between those above and those below",            // Hierarchy intergroup

  // Meso: community-wide
  "Felt by the whole community at once",            // Community macro
  "Dividing the community along old lines",         // Community factional
  "Touching everyone but spoken of by none",         // Community taboo
  "Disrupting the rhythms of daily life",            // Community practical
  "Threatening what holds the community together",   // Community cohesion
  "Reshaping who has standing and who doesn't",      // Community status

  // Liminal / transitional (van Gennep / Turner)
  "Among those between one life and the next",       // Liminal persons
  "At a moment when old rules no longer apply",      // Anti-structure
  "Between the living and what came before",          // Ancestral liminal
  "In the space between war and peace",               // Political liminal
  "At the threshold of something irreversible",       // Threshold moment

  // Cross-cutting
  "Connecting strangers who share a problem",         // Ad hoc group
  "Among those who have been wronged differently",    // Solidarity
  "Between the powerful and those they've forgotten",  // Power asymmetry
  "Rippling outward from a single act",                // Escalation
  "Between the visible and the overlooked",            // Visibility/recognition
  "Uniting enemies against a common threat",           // Strange bedfellows
  "Among those with nothing left to lose",             // Desperation
  "Between those who stay and those who leave",        // Migration/exodus
  "Across a divide that language cannot bridge",       // Communication breakdown
  "Among the keepers of something others want",        // Custodianship
  "Between the first to arrive and the last to know",  // Information asymmetry
  "Among those who will inherit what is being decided", // Intergenerational stakes
] as const;

/**
 * Pick one seed from each scene table.
 * Returns an object with situation, tension, and scope strings.
 */
export function pickSceneSeeds(): {
  situation: string;
  tension: string;
  scope: string;
} {
  return {
    situation: pickRandom(SITUATION_SEEDS),
    tension: pickRandom(TENSION_SEEDS),
    scope: pickRandom(SCOPE_SEEDS),
  };
}

/**
 * Pick tension and scope seeds only (for player-initiated actions
 * where the situation is already defined by the action type).
 */
export function pickActionSeeds(): {
  tension: string;
  scope: string;
} {
  return {
    tension: pickRandom(TENSION_SEEDS),
    scope: pickRandom(SCOPE_SEEDS),
  };
}
