export type AbilityKey = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
export type Ruleset = "dnd5e2024" | "pf2eRemaster" | "unknown";
import { characterOntology, getConfidenceBand, getOntologyFieldByLabel } from "./characterOntology";

export type ParsedSheetSection =
  | "ruleset"
  | "identity"
  | "defense"
  | "hitPoints"
  | "movement"
  | "abilities"
  | "proficiency"
  | "spellcasting"
  | "weapons"
  | "skills"
  | "saves"
  | "raw";

export type ParsedSheetRow = {
  id: string;
  section: ParsedSheetSection;
  label: string;
  value: string | number | boolean;
  confidence: number;
  sourceText: string;
  notes?: string;
};

export type CharacterPatch = {
  ruleset?: Exclude<Ruleset, "unknown">;
  name?: string;
  className?: string;
  background?: string;
  species?: string;
  level?: number;
  armorClass?: number;
  speed?: number;
  maxHp?: number;
  currentHp?: number;
  proficiencyBonus?: number;
  spellcastingAbility?: AbilityKey;
  abilities?: Partial<Record<AbilityKey, number>>;
};

export type SheetParseResult = {
  rows: ParsedSheetRow[];
  patch: CharacterPatch;
  ruleset: Ruleset;
  warnings: string[];
  normalizedText: string;
};

type AgentContext = {
  originalText: string;
  normalizedText: string;
  lowerText: string;
  lines: string[];
  rows: ParsedSheetRow[];
  warnings: string[];
  ruleset: Ruleset;
  agentLog: string[];
};

type Agent = {
  name: string;
  run: (context: AgentContext) => AgentContext;
};

type OntologyField = {
  label: string;
  section: ParsedSheetSection;
  aliases: string[];
  valueType: "string" | "number" | "boolean";
  min?: number;
  max?: number;
};

export const characterSheetOntology = {
  entities: [
    "Character",
    "Ruleset",
    "Ability",
    "Skill",
    "SavingThrow",
    "Defense",
    "HitPoints",
    "Movement",
    "Weapon",
    "Spell",
    "Roll",
    "SourceDocument",
  ],
  relationships: [
    "Character uses Ruleset",
    "Skill depends on Ability",
    "SavingThrow depends on Ability",
    "Weapon may use Ability",
    "Spell may use SpellcastingAbility",
    "SpellSaveDC depends on Ruleset, Ability, and Proficiency",
    "ImportedField maps to CharacterPatch",
    "ImportedField has Confidence",
    "ImportedField has SourceText",
  ],
};

const sectionOrder: ParsedSheetSection[] = [
  "ruleset",
  "identity",
  "defense",
  "hitPoints",
  "movement",
  "abilities",
  "proficiency",
  "spellcasting",
  "weapons",
  "skills",
  "saves",
  "raw",
];

const abilityLabelToKey: Record<string, AbilityKey> = {
  strength: "strength",
  str: "strength",
  dexterity: "dexterity",
  dex: "dexterity",
  constitution: "constitution",
  con: "constitution",
  intelligence: "intelligence",
  int: "intelligence",
  wisdom: "wisdom",
  wis: "wisdom",
  charisma: "charisma",
  cha: "charisma",
};

const abilityFields: OntologyField[] = [
  {
    label: "Strength",
    section: "abilities",
    aliases: ["Strength", "STR"],
    valueType: "number",
    min: 1,
    max: 30,
  },
  {
    label: "Dexterity",
    section: "abilities",
    aliases: ["Dexterity", "DEX"],
    valueType: "number",
    min: 1,
    max: 30,
  },
  {
    label: "Constitution",
    section: "abilities",
    aliases: ["Constitution", "CON"],
    valueType: "number",
    min: 1,
    max: 30,
  },
  {
    label: "Intelligence",
    section: "abilities",
    aliases: ["Intelligence", "INT"],
    valueType: "number",
    min: 1,
    max: 30,
  },
  {
    label: "Wisdom",
    section: "abilities",
    aliases: ["Wisdom", "WIS"],
    valueType: "number",
    min: 1,
    max: 30,
  },
  {
    label: "Charisma",
    section: "abilities",
    aliases: ["Charisma", "CHA"],
    valueType: "number",
    min: 1,
    max: 30,
  },
];

const identityFields: OntologyField[] = [
  {
    label: "Character Name",
    section: "identity",
    aliases: ["Character Name", "Name"],
    valueType: "string",
  },
  {
    label: "Class",
    section: "identity",
    aliases: ["Class"],
    valueType: "string",
  },
  {
    label: "Background",
    section: "identity",
    aliases: ["Background"],
    valueType: "string",
  },
  {
    label: "Species",
    section: "identity",
    aliases: ["Species", "Ancestry", "Race"],
    valueType: "string",
  },
  {
    label: "Level",
    section: "identity",
    aliases: ["Level"],
    valueType: "number",
    min: 1,
    max: 20,
  },
];

const numericFields: OntologyField[] = [
  {
    label: "Armor Class",
    section: "defense",
    aliases: ["Armor Class", "AC"],
    valueType: "number",
    min: 1,
    max: 50,
  },
  {
    label: "Maximum HP",
    section: "hitPoints",
    aliases: ["Maximum HP", "Max HP", "Hit Point Maximum", "Hit Points"],
    valueType: "number",
    min: 1,
    max: 999,
  },
  {
    label: "Current HP",
    section: "hitPoints",
    aliases: ["Current HP"],
    valueType: "number",
    min: 0,
    max: 999,
  },
  {
    label: "Speed",
    section: "movement",
    aliases: ["Speed", "Walking Speed"],
    valueType: "number",
    min: 0,
    max: 200,
  },
  {
    label: "Proficiency Bonus",
    section: "proficiency",
    aliases: ["Proficiency Bonus", "Prof Bonus", "Prof. Bonus"],
    valueType: "number",
    min: 0,
    max: 12,
  },
  {
    label: "Spell Save DC",
    section: "spellcasting",
    aliases: ["Spell Save DC", "Save DC"],
    valueType: "number",
    min: 1,
    max: 40,
  },
  {
    label: "Spell Attack Bonus",
    section: "spellcasting",
    aliases: ["Spell Attack Bonus", "Spell Attack"],
    valueType: "number",
    min: -10,
    max: 30,
  },
];

const skillNames = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
  "Thievery",
  "Crafting",
  "Diplomacy",
  "Occultism",
  "Society",
];

const saveNames = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma", "Fortitude", "Reflex", "Will"];

const badTextValues = new Set([
  "score",
  "modifier",
  "saving",
  "throw",
  "saving throw",
  "class",
  "level",
  "name",
  "background",
  "species",
  "ancestry",
  "armor",
  "armor class",
  "speed",
  "hit points",
  "maximum",
  "current",
  "temporary",
  "proficiency",
  "bonus",
  "spellcasting",
  "ability",
  "notes",
  "traits",
  "item",
  "prof",
  "base",
  "dex",
  "str",
  "con",
  "int",
  "wis",
  "cha",
  "t",
  "e",
  "m",
  "l",
]);

function normalizeWhitespace(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]+/g, " ")
    .replace(/\n[ ]+/g, "\n")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function makeLines(text: string) {
  return normalizeWhitespace(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function makeRowId(label: string, index: number) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`;
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLikelyBlankTemplateText(text: string) {
  const lower = text.toLowerCase();

  const templateSignals = [
    "permission granted to photocopy",
    "wizards of the coast",
    "paizo inc",
    "gain 1 at the start of each session",
    "spend all to avoid death",
    "use armor",
    "proficiency untrained",
    "trained 2 + level",
    "expert 4 + level",
    "master 6 + level",
    "legendary 8 + level",
  ];

  return templateSignals.some((signal) => lower.includes(signal));
}

function isBadTextValue(value: string) {
  const clean = value.trim().toLowerCase();
  if (!clean) return true;
  if (clean.length > 48) return true;
  if (badTextValues.has(clean)) return true;
  if (/^[+\-*/().\d\s]+$/.test(clean)) return true;
  if (/^(t|e|m|l)(\s+(t|e|m|l))*$/i.test(clean)) return true;
  return false;
}

function cleanTextValue(value: string) {
  return value
    .replace(/[:|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractInteger(value: string) {
  const match = value.match(/[-+]?\d+/);
  if (!match) return undefined;
  const numberValue = Number(match[0]);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function addRow(context: AgentContext, row: Omit<ParsedSheetRow, "id">) {
  const duplicate = context.rows.some(
    (existing) =>
      existing.section === row.section &&
      existing.label === row.label &&
      String(existing.value).toLowerCase() === String(row.value).toLowerCase(),
  );

  if (duplicate) return context;

  context.rows.push({
    ...row,
    id: makeRowId(row.label, context.rows.length),
    confidence: clampConfidence(row.confidence),
  });

  return context;
}

function validateRowAgainstOntology(row: ParsedSheetRow, ruleset: Ruleset) {
  const ontologyField = getOntologyFieldByLabel(row.label);

  if (!ontologyField) {
    return {
      row: {
        ...row,
        confidence: Math.min(row.confidence, 0.5),
        notes: row.notes
          ? `${row.notes} Ontology note: this field is not currently mapped to the character ontology.`
          : "Ontology note: this field is not currently mapped to the character ontology.",
      },
      warning: undefined,
    };
  }

  const warnings: string[] = [];
  let confidence = row.confidence;

  const appliesToRuleset =
    ontologyField.appliesTo.includes(ruleset) ||
    ontologyField.appliesTo.includes("unknown") ||
    ruleset === "unknown";

  if (!appliesToRuleset) {
    confidence = Math.min(confidence, 0.45);
    warnings.push(`${row.label} may not apply to detected ruleset ${ruleset}.`);
  }

  if (ontologyField.valueType === "number" && typeof row.value !== "number") {
    confidence = Math.min(confidence, 0.4);
    warnings.push(`${row.label} should be a number, but parser found ${typeof row.value}.`);
  }

  if (ontologyField.valueType === "string" && typeof row.value !== "string") {
    confidence = Math.min(confidence, 0.5);
    warnings.push(`${row.label} should be text, but parser found ${typeof row.value}.`);
  }

  if (ontologyField.valueType === "boolean" && typeof row.value !== "boolean") {
    confidence = Math.min(confidence, 0.5);
    warnings.push(`${row.label} should be true/false, but parser found ${typeof row.value}.`);
  }

  if (ontologyField.valueType === "enum") {
    const stringValue = String(row.value).trim();

    if (ontologyField.enumValues?.length && !ontologyField.enumValues.includes(stringValue)) {
      confidence = Math.min(confidence, 0.45);
      warnings.push(`${row.label} should be one of: ${ontologyField.enumValues.join(", ")}.`);
    }
  }

  if (typeof row.value === "number") {
    if (ontologyField.min !== undefined && row.value < ontologyField.min) {
      confidence = Math.min(confidence, 0.35);
      warnings.push(`${row.label} is below the expected minimum of ${ontologyField.min}.`);
    }

    if (ontologyField.max !== undefined && row.value > ontologyField.max) {
      confidence = Math.min(confidence, 0.35);
      warnings.push(`${row.label} is above the expected maximum of ${ontologyField.max}.`);
    }
  }

  const confidenceBand = getConfidenceBand(confidence);

  return {
    row: {
      ...row,
      confidence,
      notes: [
        row.notes,
        `Ontology: ${ontologyField.targetPath}, ${ontologyField.valueType}, ${confidenceBand} confidence.`,
        warnings.length ? `Validation issue: ${warnings.join(" ")}` : undefined,
      ]
        .filter(Boolean)
        .join(" "),
    },
    warning: warnings[0],
  };
}

function findLineContaining(context: AgentContext, aliases: string[]) {
  const lowerAliases = aliases.map((alias) => alias.toLowerCase());

  return context.lines.find((line) => {
    const lowerLine = line.toLowerCase();
    return lowerAliases.some((alias) => lowerLine.includes(alias));
  });
}

function findNearbyWindow(context: AgentContext, aliases: string[], radius = 2) {
  const lowerAliases = aliases.map((alias) => alias.toLowerCase());

  for (let index = 0; index < context.lines.length; index += 1) {
    const lowerLine = context.lines[index].toLowerCase();

    if (lowerAliases.some((alias) => lowerLine.includes(alias))) {
      const start = Math.max(0, index - radius);
      const end = Math.min(context.lines.length, index + radius + 1);
      return context.lines.slice(start, end).join(" ");
    }
  }

  return undefined;
}

function findTextAfterAlias(context: AgentContext, aliases: string[]) {
  for (const line of context.lines) {
    for (const alias of aliases) {
      const pattern = new RegExp(`\\b${escapeRegex(alias)}\\b\\s*[:\\-]?\\s*(.+)$`, "i");
      const match = line.match(pattern);

      if (match?.[1]) {
        const cleaned = cleanTextValue(match[1]);

        if (!isBadTextValue(cleaned)) {
          return {
            value: cleaned,
            sourceText: line,
            confidence: 0.82,
          };
        }
      }
    }
  }

  return undefined;
}

function findNumberAfterAlias(context: AgentContext, field: OntologyField) {
  for (const line of context.lines) {
    for (const alias of field.aliases) {
      const escapedAlias = escapeRegex(alias);

      const inlinePattern = new RegExp(`\\b${escapedAlias}\\b\\s*[:+\\-]?\\s*([-+]?\\d{1,3})\\b`, "i");
      const inlineMatch = line.match(inlinePattern);

      if (inlineMatch?.[1]) {
        const numberValue = Number(inlineMatch[1]);

        if (Number.isFinite(numberValue)) {
          const min = field.min ?? -999;
          const max = field.max ?? 999;

          if (numberValue >= min && numberValue <= max) {
            return {
              value: numberValue,
              sourceText: line,
              confidence: line.toLowerCase().includes("base") || line.toLowerCase().includes("prof") ? 0.42 : 0.76,
            };
          }
        }
      }
    }
  }

  const nearbyWindow = findNearbyWindow(context, field.aliases);

  if (!nearbyWindow) return undefined;

  const numberValue = extractInteger(nearbyWindow);
  if (numberValue === undefined) return undefined;

  const min = field.min ?? -999;
  const max = field.max ?? 999;

  if (numberValue < min || numberValue > max) return undefined;

  return {
    value: clampNumber(numberValue, min, max),
    sourceText: nearbyWindow,
    confidence: 0.45,
  };
}

function getAbilityKeyFromLabel(label: string) {
  return abilityLabelToKey[label.toLowerCase()];
}

function getAbilityLabelFromKey(key: AbilityKey) {
  const labels: Record<AbilityKey, string> = {
    strength: "Strength",
    dexterity: "Dexterity",
    constitution: "Constitution",
    intelligence: "Intelligence",
    wisdom: "Wisdom",
    charisma: "Charisma",
  };

  return labels[key];
}

function scoreRuleset(text: string) {
  const lower = text.toLowerCase();

  const dndSignals = [
    "heroic inspiration",
    "death saves",
    "hit dice",
    "dungeons & dragons",
    "dungeons and dragons",
    "wizards of the coast",
    "spellcasting ability",
    "spell save dc",
    "spell attack bonus",
    "proficiency bonus",
  ];

  const pf2eSignals = [
    "pathfinder",
    "paizo",
    "hero points",
    "ancestry",
    "heritage",
    "fortitude",
    "reflex",
    "will",
    "class dc",
    "trained",
    "expert",
    "master",
    "legendary",
  ];

  const dndScore = dndSignals.reduce((score, signal) => score + (lower.includes(signal) ? 1 : 0), 0);
  const pf2eScore = pf2eSignals.reduce((score, signal) => score + (lower.includes(signal) ? 1 : 0), 0);

  return { dndScore, pf2eScore };
}

const TextNormalizationAgent: Agent = {
  name: "Text Normalization Agent",
  run(context) {
    const normalizedText = normalizeWhitespace(context.originalText);
    const lines = makeLines(normalizedText);

    return {
      ...context,
      normalizedText,
      lowerText: normalizedText.toLowerCase(),
      lines,
      agentLog: [...context.agentLog, "Text Normalization Agent: cleaned whitespace and split sheet into lines."],
    };
  },
};

const TemplateNoiseAgent: Agent = {
  name: "Template Noise Agent",
  run(context) {
    if (!isLikelyBlankTemplateText(context.normalizedText)) {
      return {
        ...context,
        agentLog: [...context.agentLog, "Template Noise Agent: no strong blank-template warning."],
      };
    }

    return {
      ...context,
      warnings: [
        ...context.warnings,
        "This looks like a blank or mostly blank official character sheet. Template labels and example numbers may appear in the extracted text.",
      ],
      agentLog: [...context.agentLog, "Template Noise Agent: detected likely blank-template text."],
    };
  },
};

const RulesetDetectionAgent: Agent = {
  name: "Ruleset Detection Agent",
  run(context) {
    const { dndScore, pf2eScore } = scoreRuleset(context.normalizedText);

    let ruleset: Ruleset = "unknown";
    let confidence = 0.45;
    let notes = "Could not confidently identify the ruleset.";

    if (pf2eScore > dndScore && pf2eScore >= 2) {
      ruleset = "pf2eRemaster";
      confidence = Math.min(0.95, 0.62 + pf2eScore * 0.05);
      notes = `Pathfinder-style terms detected: score ${pf2eScore}.`;
    } else if (dndScore > pf2eScore && dndScore >= 2) {
      ruleset = "dnd5e2024";
      confidence = Math.min(0.95, 0.62 + dndScore * 0.05);
      notes = `D&D-style terms detected: score ${dndScore}.`;
    }

    const nextContext = {
      ...context,
      ruleset,
      agentLog: [
        ...context.agentLog,
        `Ruleset Detection Agent: dndScore=${dndScore}, pf2eScore=${pf2eScore}, ruleset=${ruleset}.`,
      ],
    };

    if (ruleset === "unknown") return nextContext;

    return addRow(nextContext, {
      section: "ruleset",
      label: "Ruleset",
      value: ruleset,
      confidence,
      sourceText: "Ruleset detected from terminology across the sheet.",
      notes,
    });
  },
};

const IdentityExtractionAgent: Agent = {
  name: "Identity Extraction Agent",
  run(context) {
    let nextContext = context;

    for (const field of identityFields) {
      if (field.valueType === "string") {
        const found = findTextAfterAlias(nextContext, field.aliases);

        if (found) {
          nextContext = addRow(nextContext, {
            section: field.section,
            label: field.label,
            value: found.value,
            confidence: found.confidence,
            sourceText: found.sourceText,
            notes: "Detected from text near the field label.",
          });
        }
      }

      if (field.valueType === "number") {
        const found = findNumberAfterAlias(nextContext, field);

        if (found) {
          nextContext = addRow(nextContext, {
            section: field.section,
            label: field.label,
            value: found.value,
            confidence: found.confidence,
            sourceText: found.sourceText,
            notes: found.confidence < 0.6 ? "Number was near the label but may be template text." : "Detected from text near the field label.",
          });
        }
      }
    }

    return {
      ...nextContext,
      agentLog: [...nextContext.agentLog, "Identity Extraction Agent: checked name, class, background, species/ancestry, and level."],
    };
  },
};

const CoreNumbersAgent: Agent = {
  name: "Core Numbers Agent",
  run(context) {
    let nextContext = context;

    for (const field of numericFields) {
      const found = findNumberAfterAlias(nextContext, field);

      if (!found) continue;

      nextContext = addRow(nextContext, {
        section: field.section,
        label: field.label,
        value: found.value,
        confidence: found.confidence,
        sourceText: found.sourceText,
        notes: found.confidence < 0.6 ? "Number was near the label but may be formula/template text." : "Detected from text near the field label.",
      });
    }

    return {
      ...nextContext,
      agentLog: [...nextContext.agentLog, "Core Numbers Agent: checked AC, HP, speed, proficiency, and spellcasting numbers."],
    };
  },
};

const AbilityScoreAgent: Agent = {
  name: "Ability Score Agent",
  run(context) {
    let nextContext = context;

    for (const field of abilityFields) {
      let bestMatch:
        | {
            value: number;
            sourceText: string;
            confidence: number;
          }
        | undefined;

      for (const line of nextContext.lines) {
        for (const alias of field.aliases) {
          const escapedAlias = escapeRegex(alias);

          const inlinePatterns = [
            new RegExp(`\\b${escapedAlias}\\b\\s*[:\\-]?\\s*(\\d{1,2})\\b`, "i"),
            new RegExp(`\\b${escapedAlias}\\b.*?score\\s*[:\\-]?\\s*(\\d{1,2})\\b`, "i"),
          ];

          for (const pattern of inlinePatterns) {
            const match = line.match(pattern);

            if (match?.[1]) {
              const numberValue = Number(match[1]);

              if (Number.isFinite(numberValue) && numberValue >= 1 && numberValue <= 30) {
                const lowerLine = line.toLowerCase();
                const confidence = lowerLine.includes("partial boost") || lowerLine.includes("prof item") ? 0.42 : 0.78;

                if (!bestMatch || confidence > bestMatch.confidence) {
                  bestMatch = {
                    value: numberValue,
                    sourceText: line,
                    confidence,
                  };
                }
              }
            }
          }
        }
      }

      if (bestMatch) {
        nextContext = addRow(nextContext, {
          section: "abilities",
          label: field.label,
          value: bestMatch.value,
          confidence: bestMatch.confidence,
          sourceText: bestMatch.sourceText,
          notes: bestMatch.confidence < 0.6 ? "Possible ability score, but the source text may be a blank template region." : "Detected as an ability score.",
        });
      }
    }

    return {
      ...nextContext,
      agentLog: [...nextContext.agentLog, "Ability Score Agent: checked six ability scores."],
    };
  },
};

const SpellcastingAbilityAgent: Agent = {
  name: "Spellcasting Ability Agent",
  run(context) {
    const line = findLineContaining(context, ["spellcasting ability"]);

    if (!line) {
      return {
        ...context,
        agentLog: [...context.agentLog, "Spellcasting Ability Agent: no spellcasting ability field found."],
      };
    }

    const lowerLine = line.toLowerCase();

    for (const [label, key] of Object.entries(abilityLabelToKey)) {
      if (label.length === 3) continue;

      if (lowerLine.includes(label)) {
        const nextContext = addRow(context, {
          section: "spellcasting",
          label: "Spellcasting Ability",
          value: key,
          confidence: 0.72,
          sourceText: line,
          notes: "Detected from spellcasting ability text.",
        });

        return {
          ...nextContext,
          agentLog: [...nextContext.agentLog, "Spellcasting Ability Agent: detected spellcasting ability."],
        };
      }
    }

    return {
      ...context,
      agentLog: [...context.agentLog, "Spellcasting Ability Agent: field found, but ability value was unclear."],
    };
  },
};

const SkillDetectionAgent: Agent = {
  name: "Skill Detection Agent",
  run(context) {
    let nextContext = context;

    for (const skillName of skillNames) {
      const line = findLineContaining(nextContext, [skillName]);

      if (!line) continue;

      const lowerLine = line.toLowerCase();
      const hasPossibleMark =
        /\b(proficient|trained|expert|master|legendary)\b/i.test(line) ||
        /\b[x✓✔●]\b/i.test(line) ||
        /\b(t|e|m|l)\b/i.test(line);

      nextContext = addRow(nextContext, {
        section: "skills",
        label: `${skillName} Skill`,
        value: hasPossibleMark,
        confidence: hasPossibleMark ? 0.55 : 0.35,
        sourceText: line,
        notes: hasPossibleMark
          ? "Skill row was visible and may include a proficiency marker."
          : "Skill label was visible, but no clear proficiency marker was detected.",
      });

      if (lowerLine.includes("stealth") && lowerLine.includes("armor")) {
        nextContext = addRow(nextContext, {
          section: "raw",
          label: "Armor Check Context",
          value: line,
          confidence: 0.35,
          sourceText: line,
          notes: "This looks like a template/calculation row, not a filled character value.",
        });
      }
    }

    return {
      ...nextContext,
      agentLog: [...nextContext.agentLog, "Skill Detection Agent: checked visible skill rows and possible proficiency markers."],
    };
  },
};

const SavingThrowDetectionAgent: Agent = {
  name: "Saving Throw Detection Agent",
  run(context) {
    let nextContext = context;

    for (const saveName of saveNames) {
      const line = findLineContaining(nextContext, [`${saveName} Saving Throw`, `${saveName} Save`, saveName]);

      if (!line) continue;

      const hasSaveContext = /save|saving throw|fortitude|reflex|will/i.test(line);

      if (!hasSaveContext && ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"].includes(saveName)) {
        continue;
      }

      const hasPossibleMark =
        /\b(proficient|trained|expert|master|legendary)\b/i.test(line) ||
        /\b[x✓✔●]\b/i.test(line) ||
        /\b(t|e|m|l)\b/i.test(line);

      nextContext = addRow(nextContext, {
        section: "saves",
        label: `${saveName} Save`,
        value: hasPossibleMark,
        confidence: hasPossibleMark ? 0.55 : 0.38,
        sourceText: line,
        notes: hasPossibleMark
          ? "Save row was visible and may include a proficiency marker."
          : "Save label was visible, but no clear proficiency marker was detected.",
      });
    }

    return {
      ...nextContext,
      agentLog: [...nextContext.agentLog, "Saving Throw Detection Agent: checked saving throw rows and possible proficiency markers."],
    };
  },
};

const WeaponDetectionAgent: Agent = {
  name: "Weapon Detection Agent",
  run(context) {
    let nextContext = context;

    const weaponLines = context.lines.filter((line) => {
      const lower = line.toLowerCase();
      return lower.includes("weapon") || lower.includes("strike") || lower.includes("damage");
    });

    for (const line of weaponLines.slice(0, 8)) {
      const lower = line.toLowerCase();

      if (lower === "weapon" || lower === "damage" || lower.includes("traits and notes")) {
        nextContext = addRow(nextContext, {
          section: "weapons",
          label: "Weapon Row",
          value: line,
          confidence: 0.25,
          sourceText: line,
          notes: "Weapon-related template text was visible, but no filled weapon name was confidently detected.",
        });
        continue;
      }

      nextContext = addRow(nextContext, {
        section: "weapons",
        label: "Weapon Row",
        value: line,
        confidence: 0.45,
        sourceText: line,
        notes: "Weapon-related text found. Review before using as character data.",
      });
    }

    return {
      ...nextContext,
      agentLog: [...nextContext.agentLog, "Weapon Detection Agent: checked weapon and damage rows."],
    };
  },
};

const OntologyValidationAgent: Agent = {
  name: "Ontology Validation Agent",
  run(context) {
    const validatedRows: ParsedSheetRow[] = [];
    const validationWarnings: string[] = [];

    for (const row of context.rows) {
      const validation = validateRowAgainstOntology(row, context.ruleset);
      validatedRows.push(validation.row);

      if (validation.warning) {
        validationWarnings.push(validation.warning);
      }
    }

    const uniqueWarnings = Array.from(new Set(validationWarnings));

    return {
      ...context,
      rows: validatedRows,
      warnings: [...context.warnings, ...uniqueWarnings],
      agentLog: [
        ...context.agentLog,
        `Ontology Validation Agent: validated ${validatedRows.length} rows against the character ontology.`,
      ],
    };
  },
};


const PatchComposerAgent: Agent = {
  name: "Character Patch Composer Agent",
  run(context) {
    const meaningfulRows = context.rows.filter((row) => row.confidence >= 0.5);

    if (meaningfulRows.length <= 1) {
      return {
        ...context,
        warnings: [...context.warnings, "Low confidence import. Review the detected rows before applying anything."],
        agentLog: [...context.agentLog, "Character Patch Composer Agent: low number of meaningful rows; added warning."],
      };
    }

    return {
      ...context,
      agentLog: [...context.agentLog, "Character Patch Composer Agent: enough candidate rows found for review."],
    };
  },
};

const SheetImportAgents: Agent[] = [
  TextNormalizationAgent,
  TemplateNoiseAgent,
  RulesetDetectionAgent,
  IdentityExtractionAgent,
  CoreNumbersAgent,
  AbilityScoreAgent,
  SpellcastingAbilityAgent,
  SkillDetectionAgent,
  SavingThrowDetectionAgent,
  WeaponDetectionAgent,
  OntologyValidationAgent,
  PatchComposerAgent,
];

function rowsToCharacterPatch(rows: ParsedSheetRow[], ruleset: Ruleset): CharacterPatch {
  const patch: CharacterPatch = {};

  if (ruleset !== "unknown") {
    patch.ruleset = ruleset;
  }

  for (const row of rows) {
    if (row.confidence < 0.55) continue;

    const label = row.label.toLowerCase();
    const value = row.value;

    if (label === "ruleset") {
      if (value === "dnd5e2024" || value === "pf2eRemaster") {
        patch.ruleset = value;
      }
      continue;
    }

    if ((label === "character name" || label === "name") && typeof value === "string") {
      patch.name = value;
      continue;
    }

    if (label === "class" && typeof value === "string") {
      patch.className = value;
      continue;
    }

    if (label === "background" && typeof value === "string") {
      patch.background = value;
      continue;
    }

    if ((label === "species" || label === "ancestry") && typeof value === "string") {
      patch.species = value;
      continue;
    }

    if (label === "level" && typeof value === "number") {
      patch.level = clampNumber(value, 1, 20);
      continue;
    }

    if ((label === "armor class" || label === "ac") && typeof value === "number") {
      patch.armorClass = clampNumber(value, 1, 50);
      continue;
    }

    if (label === "speed" && typeof value === "number") {
      patch.speed = clampNumber(value, 0, 200);
      continue;
    }

    if ((label === "maximum hp" || label === "max hp" || label === "hit point maximum") && typeof value === "number") {
      patch.maxHp = clampNumber(value, 1, 999);
      patch.currentHp = patch.currentHp ?? patch.maxHp;
      continue;
    }

    if (label === "current hp" && typeof value === "number") {
      patch.currentHp = clampNumber(value, 0, 999);
      continue;
    }

    if (label === "proficiency bonus" && typeof value === "number") {
      patch.proficiencyBonus = clampNumber(value, 0, 12);
      continue;
    }

    if (label === "spellcasting ability" && typeof value === "string") {
      const abilityKey = getAbilityKeyFromLabel(value);
      if (abilityKey) patch.spellcastingAbility = abilityKey;
      continue;
    }

    const abilityKey = getAbilityKeyFromLabel(row.label);
    if (abilityKey && typeof value === "number") {
      patch.abilities = {
        ...patch.abilities,
        [abilityKey]: clampNumber(value, 1, 30),
      };
    }
  }

  return patch;
}

function createInitialContext(text: string): AgentContext {
  return {
    originalText: text,
    normalizedText: "",
    lowerText: "",
    lines: [],
    rows: [],
    warnings: [],
    ruleset: "unknown",
    agentLog: [],
  };
}

export function parseSheetText(text: string): SheetParseResult {
  const initialContext = createInitialContext(text);

  const finalContext = SheetImportAgents.reduce((context, agent) => agent.run(context), initialContext);

  const patch = rowsToCharacterPatch(finalContext.rows, finalContext.ruleset);

  const normalizedText = [
    finalContext.normalizedText,
    "",
    "Agent Log:",
    ...finalContext.agentLog.map((entry) => `- ${entry}`),
    "",
    "Semantic Layer:",
    `Entities: ${characterOntology.entities.map((entity) => entity.label).join(", ")}`,
    `Relationships: ${characterOntology.relationships.map((relationship) => `${relationship.from} ${relationship.label} ${relationship.to}`).join("; ")}`,
  ].join("\n");

  return {
    rows: finalContext.rows,
    patch,
    ruleset: finalContext.ruleset,
    warnings: finalContext.warnings,
    normalizedText,
  };
}

export function rowsBySection(rows: ParsedSheetRow[]) {
  const grouped = sectionOrder.reduce((accumulator, section) => {
    accumulator[section] = [];
    return accumulator;
  }, {} as Record<ParsedSheetSection, ParsedSheetRow[]>);

  for (const row of rows) {
    grouped[row.section].push(row);
  }

  return grouped;
}

export function describeCharacterPatch(patch: CharacterPatch) {
  const lines: string[] = [];

  if (patch.ruleset) lines.push(`Ruleset: ${patch.ruleset}`);
  if (patch.name) lines.push(`Name: ${patch.name}`);
  if (patch.className) lines.push(`Class: ${patch.className}`);
  if (patch.background) lines.push(`Background: ${patch.background}`);
  if (patch.species) lines.push(`Species: ${patch.species}`);
  if (patch.level !== undefined) lines.push(`Level: ${patch.level}`);
  if (patch.armorClass !== undefined) lines.push(`Armor Class: ${patch.armorClass}`);
  if (patch.speed !== undefined) lines.push(`Speed: ${patch.speed}`);
  if (patch.maxHp !== undefined) lines.push(`Maximum HP: ${patch.maxHp}`);
  if (patch.currentHp !== undefined) lines.push(`Current HP: ${patch.currentHp}`);
  if (patch.proficiencyBonus !== undefined) lines.push(`Proficiency Bonus: ${patch.proficiencyBonus}`);
  if (patch.spellcastingAbility) lines.push(`Spellcasting Ability: ${patch.spellcastingAbility}`);

  if (patch.abilities) {
    for (const [ability, value] of Object.entries(patch.abilities)) {
      lines.push(`${getAbilityLabelFromKey(ability as AbilityKey)}: ${value}`);
    }
  }

  return lines;
}