export type OntologyRuleset = "dnd5e2024" | "pf2eRemaster" | "unknown";

export type OntologyEntityType =
  | "Character"
  | "Ruleset"
  | "SourceDocument"
  | "ImportedField"
  | "ImportConfidence"
  | "Ability"
  | "Skill"
  | "SavingThrow"
  | "Defense"
  | "HitPoints"
  | "Movement"
  | "Proficiency"
  | "Weapon"
  | "Spell"
  | "Roll"
  | "Modifier"
  | "Condition"
  | "Resource";

export type OntologyValueType = "string" | "number" | "boolean" | "enum" | "list" | "object";

export type OntologyConfidencePolicy = {
  high: number;
  medium: number;
  low: number;
};

export type OntologyEntity = {
  id: string;
  type: OntologyEntityType;
  label: string;
  description: string;
};

export type OntologyRelationship = {
  id: string;
  from: OntologyEntityType;
  to: OntologyEntityType;
  label: string;
  description: string;
};

export type OntologyField = {
  id: string;
  label: string;
  entity: OntologyEntityType;
  valueType: OntologyValueType;
  aliases: string[];
  appliesTo: OntologyRuleset[];
  targetPath: string;
  min?: number;
  max?: number;
  enumValues?: string[];
  description: string;
  validationNotes: string[];
};

export type OntologyCalculation = {
  id: string;
  label: string;
  appliesTo: OntologyRuleset[];
  inputs: string[];
  output: string;
  formulaDescription: string;
};

export type CharacterOntology = {
  version: string;
  name: string;
  purpose: string;
  rulesets: {
    id: OntologyRuleset;
    label: string;
    description: string;
  }[];
  confidencePolicy: OntologyConfidencePolicy;
  entities: OntologyEntity[];
  relationships: OntologyRelationship[];
  fields: OntologyField[];
  calculations: OntologyCalculation[];
};

export const characterOntology: CharacterOntology = {
  version: "0.1.0",
  name: "Tabletop Character Sheet Ontology",
  purpose:
    "Defines the core entities, relationships, fields, and calculations needed to convert messy character sheet inputs into structured character data.",

  rulesets: [
    {
      id: "dnd5e2024",
      label: "D&D 2024 / 5e",
      description:
        "Dungeons & Dragons 2024-style character sheets using ability scores, proficiency bonus, skills, saves, armor class, hit points, weapons, and spells.",
    },
    {
      id: "pf2eRemaster",
      label: "Pathfinder 2e Remaster",
      description:
        "Pathfinder 2e Remaster-style character sheets using ancestry, heritage, trained/expert/master/legendary proficiency, class DC, fortitude, reflex, will, weapons, and spells.",
    },
    {
      id: "unknown",
      label: "Unknown Ruleset",
      description:
        "Used when the source document does not provide enough clear evidence to choose a ruleset confidently.",
    },
  ],

  confidencePolicy: {
    high: 0.8,
    medium: 0.6,
    low: 0.0,
  },

  entities: [
    {
      id: "character",
      type: "Character",
      label: "Character",
      description:
        "The player character being represented by the app. This is the main object that imported sheet data updates.",
    },
    {
      id: "ruleset",
      type: "Ruleset",
      label: "Ruleset",
      description:
        "The game system that determines terminology, valid fields, and calculations.",
    },
    {
      id: "source-document",
      type: "SourceDocument",
      label: "Source Document",
      description:
        "The PDF, image, OCR text, or JSON file used as the source for an import.",
    },
    {
      id: "imported-field",
      type: "ImportedField",
      label: "Imported Field",
      description:
        "A detected candidate value from a character sheet before it is approved by the user.",
    },
    {
      id: "import-confidence",
      type: "ImportConfidence",
      label: "Import Confidence",
      description:
        "A score describing how reliable a detected imported field appears to be.",
    },
    {
      id: "ability",
      type: "Ability",
      label: "Ability",
      description:
        "A core character ability such as Strength, Dexterity, Constitution, Intelligence, Wisdom, or Charisma.",
    },
    {
      id: "skill",
      type: "Skill",
      label: "Skill",
      description:
        "A trained or untrained character competency that usually depends on an ability.",
    },
    {
      id: "saving-throw",
      type: "SavingThrow",
      label: "Saving Throw",
      description:
        "A defensive roll used to resist effects. D&D uses six ability saves. Pathfinder uses Fortitude, Reflex, and Will.",
    },
    {
      id: "defense",
      type: "Defense",
      label: "Defense",
      description:
        "A defensive statistic such as Armor Class, Class DC, Passive Perception, or Perception DC.",
    },
    {
      id: "hit-points",
      type: "HitPoints",
      label: "Hit Points",
      description:
        "The character's maximum, current, and temporary hit points.",
    },
    {
      id: "movement",
      type: "Movement",
      label: "Movement",
      description:
        "The character's movement speeds, such as walking speed.",
    },
    {
      id: "proficiency",
      type: "Proficiency",
      label: "Proficiency",
      description:
        "A ruleset-specific training or proficiency value that modifies rolls and DCs.",
    },
    {
      id: "weapon",
      type: "Weapon",
      label: "Weapon",
      description:
        "A weapon or strike that can produce attack and damage rolls.",
    },
    {
      id: "spell",
      type: "Spell",
      label: "Spell",
      description:
        "A magical or supernatural action with a rank/level, tradition, attack roll, save DC, damage, or notes.",
    },
    {
      id: "roll",
      type: "Roll",
      label: "Roll",
      description:
        "A dice roll made by the app, including dice results, modifiers, and final total.",
    },
    {
      id: "modifier",
      type: "Modifier",
      label: "Modifier",
      description:
        "A numerical adjustment applied to a roll or DC.",
    },
    {
      id: "condition",
      type: "Condition",
      label: "Condition",
      description:
        "A temporary effect that can change character statistics or roll outcomes.",
    },
    {
      id: "resource",
      type: "Resource",
      label: "Resource",
      description:
        "A spendable or trackable character resource such as spell slots, focus points, hit dice, hero points, or inspiration.",
    },
  ],

  relationships: [
    {
      id: "character-uses-ruleset",
      from: "Character",
      to: "Ruleset",
      label: "uses ruleset",
      description:
        "A character is interpreted according to a game ruleset.",
    },
    {
      id: "source-produces-imported-field",
      from: "SourceDocument",
      to: "ImportedField",
      label: "produces imported field",
      description:
        "A source document can produce candidate imported fields through parsing, OCR, or AI analysis.",
    },
    {
      id: "imported-field-has-confidence",
      from: "ImportedField",
      to: "ImportConfidence",
      label: "has confidence",
      description:
        "Each imported field should carry a confidence score before being applied.",
    },
    {
      id: "imported-field-updates-character",
      from: "ImportedField",
      to: "Character",
      label: "updates character",
      description:
        "Approved imported fields update the structured character object.",
    },
    {
      id: "skill-depends-on-ability",
      from: "Skill",
      to: "Ability",
      label: "depends on ability",
      description:
        "A skill roll usually adds the modifier from a related ability.",
    },
    {
      id: "saving-throw-depends-on-ability",
      from: "SavingThrow",
      to: "Ability",
      label: "depends on ability",
      description:
        "D&D saving throws depend on the matching ability. Pathfinder saves are mapped separately.",
    },
    {
      id: "weapon-uses-ability",
      from: "Weapon",
      to: "Ability",
      label: "uses ability",
      description:
        "A weapon attack or damage roll may use an ability modifier.",
    },
    {
      id: "spell-uses-ability",
      from: "Spell",
      to: "Ability",
      label: "uses spellcasting ability",
      description:
        "A spell attack or save DC can depend on the character's spellcasting ability.",
    },
    {
      id: "roll-has-modifier",
      from: "Roll",
      to: "Modifier",
      label: "has modifier",
      description:
        "A roll is composed of dice plus one or more modifiers.",
    },
    {
      id: "defense-derived-from-ruleset",
      from: "Defense",
      to: "Ruleset",
      label: "derived from ruleset",
      description:
        "Defensive statistics may have different names or formulas depending on the ruleset.",
    },
    {
      id: "proficiency-derived-from-ruleset",
      from: "Proficiency",
      to: "Ruleset",
      label: "derived from ruleset",
      description:
        "D&D uses a proficiency bonus. Pathfinder uses proficiency ranks plus level.",
    },
  ],

  fields: [
    {
      id: "ruleset",
      label: "Ruleset",
      entity: "Ruleset",
      valueType: "enum",
      aliases: ["Ruleset", "System", "Game System"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "ruleset",
      enumValues: ["dnd5e2024", "pf2eRemaster", "unknown"],
      description:
        "The game system used by the character sheet.",
      validationNotes: [
        "Infer from terminology when not explicitly stated.",
        "D&D signals include heroic inspiration, death saves, hit dice, and proficiency bonus.",
        "Pathfinder signals include ancestry, heritage, hero points, fortitude, reflex, will, trained, expert, master, and legendary.",
      ],
    },
    {
      id: "character-name",
      label: "Character Name",
      entity: "Character",
      valueType: "string",
      aliases: ["Character Name", "Name", "Player Character"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "name",
      description:
        "The character's name.",
      validationNotes: [
        "Avoid using field labels or placeholder text as a name.",
        "Prefer handwritten or filled values over template text.",
      ],
    },
    {
      id: "class",
      label: "Class",
      entity: "Character",
      valueType: "string",
      aliases: ["Class", "Class & Level", "Class Name"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "className",
      description:
        "The character's class.",
      validationNotes: [
        "May appear near level.",
        "Do not treat the word Class by itself as a value.",
      ],
    },
    {
      id: "background",
      label: "Background",
      entity: "Character",
      valueType: "string",
      aliases: ["Background"],
      appliesTo: ["dnd5e2024", "unknown"],
      targetPath: "background",
      description:
        "The D&D-style character background.",
      validationNotes: [
        "Usually a text value.",
        "May not exist on Pathfinder sheets in the same form.",
      ],
    },
    {
      id: "species",
      label: "Species",
      entity: "Character",
      valueType: "string",
      aliases: ["Species", "Race"],
      appliesTo: ["dnd5e2024", "unknown"],
      targetPath: "species",
      description:
        "The D&D-style species or legacy race field.",
      validationNotes: [
        "D&D 2024 usually uses Species.",
        "Older sheets may use Race.",
      ],
    },
    {
      id: "ancestry",
      label: "Ancestry",
      entity: "Character",
      valueType: "string",
      aliases: ["Ancestry", "Heritage"],
      appliesTo: ["pf2eRemaster", "unknown"],
      targetPath: "species",
      description:
        "The Pathfinder-style ancestry or heritage field. This maps into the app's species field for now.",
      validationNotes: [
        "Pathfinder commonly separates ancestry and heritage.",
        "The current app stores this in the species field until a richer ancestry model exists.",
      ],
    },
    {
      id: "level",
      label: "Level",
      entity: "Character",
      valueType: "number",
      aliases: ["Level", "Character Level"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "level",
      min: 1,
      max: 20,
      description:
        "The character's level.",
      validationNotes: [
        "Valid range is usually 1 to 20.",
        "Be careful not to confuse spell level/rank with character level.",
      ],
    },
    {
      id: "armor-class",
      label: "Armor Class",
      entity: "Defense",
      valueType: "number",
      aliases: ["Armor Class", "AC"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "armorClass",
      min: 1,
      max: 50,
      description:
        "The character's armor class.",
      validationNotes: [
        "Avoid extracting formula parts as the final AC.",
        "Prefer the large filled AC value when visible.",
      ],
    },
    {
      id: "speed",
      label: "Speed",
      entity: "Movement",
      valueType: "number",
      aliases: ["Speed", "Walking Speed", "Land Speed"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "speed",
      min: 0,
      max: 200,
      description:
        "The character's primary movement speed.",
      validationNotes: [
        "Feet are assumed in the current app.",
        "If multiple speeds exist, prefer walking or land speed.",
      ],
    },
    {
      id: "maximum-hp",
      label: "Maximum HP",
      entity: "HitPoints",
      valueType: "number",
      aliases: ["Maximum HP", "Max HP", "Hit Point Maximum", "Hit Points", "HP Max"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "maxHp",
      min: 1,
      max: 999,
      description:
        "The character's maximum hit points.",
      validationNotes: [
        "Do not confuse current HP, temporary HP, or hit dice with maximum HP.",
        "If only one HP value is filled, it can be treated as both current and maximum with review.",
      ],
    },
    {
      id: "current-hp",
      label: "Current HP",
      entity: "HitPoints",
      valueType: "number",
      aliases: ["Current HP", "Current Hit Points"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "currentHp",
      min: 0,
      max: 999,
      description:
        "The character's current hit points.",
      validationNotes: [
        "May be blank on a permanent character sheet.",
        "Should not exceed maximum HP unless temporary HP is involved.",
      ],
    },
    {
      id: "temporary-hp",
      label: "Temporary HP",
      entity: "HitPoints",
      valueType: "number",
      aliases: ["Temporary HP", "Temp HP", "Temporary Hit Points"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "tempHp",
      min: 0,
      max: 999,
      description:
        "Temporary hit points.",
      validationNotes: [
        "Often blank.",
        "Should default to 0 when not present.",
      ],
    },
    {
      id: "proficiency-bonus",
      label: "Proficiency Bonus",
      entity: "Proficiency",
      valueType: "number",
      aliases: ["Proficiency Bonus", "Prof Bonus", "Prof. Bonus"],
      appliesTo: ["dnd5e2024", "unknown"],
      targetPath: "proficiencyBonus",
      min: 0,
      max: 12,
      description:
        "The D&D proficiency bonus.",
      validationNotes: [
        "Usually ranges from +2 to +6 in D&D.",
        "Pathfinder does not use this field the same way.",
      ],
    },
    {
      id: "pathfinder-trained-bonus",
      label: "Pathfinder Trained Bonus",
      entity: "Proficiency",
      valueType: "number",
      aliases: ["Trained", "Expert", "Master", "Legendary"],
      appliesTo: ["pf2eRemaster"],
      targetPath: "derived.proficiencyRank",
      description:
        "Pathfinder proficiency rank. This is not directly stored in the current app yet.",
      validationNotes: [
        "Untrained = level + 0.",
        "Trained = level + 2.",
        "Expert = level + 4.",
        "Master = level + 6.",
        "Legendary = level + 8.",
      ],
    },
    {
      id: "spellcasting-ability",
      label: "Spellcasting Ability",
      entity: "Spell",
      valueType: "enum",
      aliases: ["Spellcasting Ability", "Spell Ability", "Key Ability", "Casting Ability"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "spellcastingAbility",
      enumValues: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
      description:
        "The ability used for spell attack and spell save calculations.",
      validationNotes: [
        "D&D usually names a spellcasting ability directly.",
        "Pathfinder may refer to a key ability or class DC instead.",
      ],
    },
    {
      id: "spell-save-dc",
      label: "Spell Save DC",
      entity: "Spell",
      valueType: "number",
      aliases: ["Spell Save DC", "Save DC", "Spell DC"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "derived.spellSaveDc",
      min: 1,
      max: 50,
      description:
        "The final DC used by spells that require a saving throw.",
      validationNotes: [
        "The current app derives this from ability and proficiency.",
        "Imported value can be used for validation or future override support.",
      ],
    },
    {
      id: "spell-attack-bonus",
      label: "Spell Attack Bonus",
      entity: "Spell",
      valueType: "number",
      aliases: ["Spell Attack Bonus", "Spell Attack", "Spell Attack Modifier"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "derived.spellAttackBonus",
      min: -10,
      max: 50,
      description:
        "The final attack modifier used by spells that require attack rolls.",
      validationNotes: [
        "The current app derives this from ability and proficiency.",
        "Imported value can be used for validation or future override support.",
      ],
    },
    {
      id: "strength",
      label: "Strength",
      entity: "Ability",
      valueType: "number",
      aliases: ["Strength", "STR"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "abilities.strength",
      min: 1,
      max: 30,
      description:
        "Physical power ability score.",
      validationNotes: [
        "Do not confuse the ability score with the modifier.",
        "Ability score is usually 1 to 30.",
      ],
    },
    {
      id: "dexterity",
      label: "Dexterity",
      entity: "Ability",
      valueType: "number",
      aliases: ["Dexterity", "DEX"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "abilities.dexterity",
      min: 1,
      max: 30,
      description:
        "Agility ability score.",
      validationNotes: [
        "Do not confuse the ability score with the modifier.",
        "Dexterity often contributes to initiative, armor class, and ranged/finesse attacks.",
      ],
    },
    {
      id: "constitution",
      label: "Constitution",
      entity: "Ability",
      valueType: "number",
      aliases: ["Constitution", "CON"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "abilities.constitution",
      min: 1,
      max: 30,
      description:
        "Endurance ability score.",
      validationNotes: [
        "Do not confuse the ability score with the modifier.",
        "Constitution often contributes to hit points or Fortitude-style defenses.",
      ],
    },
    {
      id: "intelligence",
      label: "Intelligence",
      entity: "Ability",
      valueType: "number",
      aliases: ["Intelligence", "INT"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "abilities.intelligence",
      min: 1,
      max: 30,
      description:
        "Reasoning ability score.",
      validationNotes: [
        "Do not confuse the ability score with the modifier.",
      ],
    },
    {
      id: "wisdom",
      label: "Wisdom",
      entity: "Ability",
      valueType: "number",
      aliases: ["Wisdom", "WIS"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "abilities.wisdom",
      min: 1,
      max: 30,
      description:
        "Awareness and insight ability score.",
      validationNotes: [
        "Do not confuse the ability score with the modifier.",
        "Wisdom often contributes to perception.",
      ],
    },
    {
      id: "charisma",
      label: "Charisma",
      entity: "Ability",
      valueType: "number",
      aliases: ["Charisma", "CHA"],
      appliesTo: ["dnd5e2024", "pf2eRemaster", "unknown"],
      targetPath: "abilities.charisma",
      min: 1,
      max: 30,
      description:
        "Presence and social force ability score.",
      validationNotes: [
        "Do not confuse the ability score with the modifier.",
      ],
    },
  ],

  calculations: [
    {
      id: "dnd-ability-modifier",
      label: "D&D Ability Modifier",
      appliesTo: ["dnd5e2024", "unknown"],
      inputs: ["Ability Score"],
      output: "Ability Modifier",
      formulaDescription:
        "Ability modifier equals floor((ability score - 10) / 2).",
    },
    {
      id: "dnd-skill-roll",
      label: "D&D Skill Roll",
      appliesTo: ["dnd5e2024"],
      inputs: ["d20", "Ability Modifier", "Proficiency Bonus if proficient"],
      output: "Skill Check Total",
      formulaDescription:
        "Roll 1d20, add the linked ability modifier, and add proficiency bonus if proficient.",
    },
    {
      id: "dnd-saving-throw",
      label: "D&D Saving Throw",
      appliesTo: ["dnd5e2024"],
      inputs: ["d20", "Ability Modifier", "Proficiency Bonus if proficient"],
      output: "Saving Throw Total",
      formulaDescription:
        "Roll 1d20, add the linked ability modifier, and add proficiency bonus if proficient.",
    },
    {
      id: "dnd-spell-save-dc",
      label: "D&D Spell Save DC",
      appliesTo: ["dnd5e2024"],
      inputs: ["Base 8", "Spellcasting Ability Modifier", "Proficiency Bonus"],
      output: "Spell Save DC",
      formulaDescription:
        "Spell Save DC equals 8 plus spellcasting ability modifier plus proficiency bonus.",
    },
    {
      id: "dnd-spell-attack",
      label: "D&D Spell Attack Bonus",
      appliesTo: ["dnd5e2024"],
      inputs: ["Spellcasting Ability Modifier", "Proficiency Bonus"],
      output: "Spell Attack Bonus",
      formulaDescription:
        "Spell attack bonus equals spellcasting ability modifier plus proficiency bonus.",
    },
    {
      id: "pf2e-trained-proficiency",
      label: "Pathfinder Trained Proficiency",
      appliesTo: ["pf2eRemaster"],
      inputs: ["Character Level", "Proficiency Rank"],
      output: "Proficiency Modifier",
      formulaDescription:
        "Untrained adds 0. Trained adds level + 2. Expert adds level + 4. Master adds level + 6. Legendary adds level + 8.",
    },
    {
      id: "pf2e-check",
      label: "Pathfinder Check",
      appliesTo: ["pf2eRemaster"],
      inputs: ["d20", "Ability Modifier", "Proficiency Modifier", "Item Bonus", "Status Bonus", "Circumstance Bonus", "Penalty"],
      output: "Check Total",
      formulaDescription:
        "Roll 1d20 and add the relevant modifiers. The current app supports a simplified version using ability modifier plus trained bonus.",
    },
    {
      id: "pf2e-spell-dc",
      label: "Pathfinder Spell DC",
      appliesTo: ["pf2eRemaster"],
      inputs: ["Base 10", "Spellcasting Ability Modifier", "Proficiency Modifier"],
      output: "Spell DC",
      formulaDescription:
        "Spell DC usually equals 10 plus spellcasting ability modifier plus spellcasting proficiency modifier.",
    },
  ],
};

export function getOntologyFieldsForRuleset(ruleset: OntologyRuleset) {
  return characterOntology.fields.filter((field) => field.appliesTo.includes(ruleset) || field.appliesTo.includes("unknown"));
}

export function getOntologyFieldById(fieldId: string) {
  return characterOntology.fields.find((field) => field.id === fieldId);
}

export function getOntologyFieldByLabel(label: string) {
  const normalizedLabel = label.trim().toLowerCase();

  return characterOntology.fields.find((field) => {
    if (field.label.toLowerCase() === normalizedLabel) return true;
    return field.aliases.some((alias) => alias.toLowerCase() === normalizedLabel);
  });
}

export function getOntologyFieldsByEntity(entity: OntologyEntityType) {
  return characterOntology.fields.filter((field) => field.entity === entity);
}

export function getOntologyRelationshipsForEntity(entity: OntologyEntityType) {
  return characterOntology.relationships.filter((relationship) => relationship.from === entity || relationship.to === entity);
}

export function getConfidenceBand(confidence: number) {
  if (confidence >= characterOntology.confidencePolicy.high) return "high";
  if (confidence >= characterOntology.confidencePolicy.medium) return "medium";
  return "low";
}

export function describeOntologyForPrompt() {
  const entityLines = characterOntology.entities.map((entity) => `- ${entity.label}: ${entity.description}`);
  const relationshipLines = characterOntology.relationships.map(
    (relationship) => `- ${relationship.from} ${relationship.label} ${relationship.to}: ${relationship.description}`,
  );
  const fieldLines = characterOntology.fields.map(
    (field) => `- ${field.label} (${field.targetPath}, ${field.valueType}): aliases ${field.aliases.join(", ")}`,
  );
  const calculationLines = characterOntology.calculations.map(
    (calculation) => `- ${calculation.label}: ${calculation.formulaDescription}`,
  );

  return [
    `Ontology: ${characterOntology.name}`,
    `Purpose: ${characterOntology.purpose}`,
    "",
    "Entities:",
    ...entityLines,
    "",
    "Relationships:",
    ...relationshipLines,
    "",
    "Fields:",
    ...fieldLines,
    "",
    "Calculations:",
    ...calculationLines,
  ].join("\n");
}