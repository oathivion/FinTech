export type AbilityKey = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
export type Ruleset = "dnd5e2024" | "pf2eRemaster" | "unknown";

export type ParsedSheetSection =
  | "identity"
  | "ruleset"
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

type FieldDefinition = {
  section: ParsedSheetSection;
  label: string;
  patchKey?: keyof CharacterPatch;
  aliases: string[];
  kind: "text" | "number" | "ability" | "ruleset";
  min?: number;
  max?: number;
};

const abilityLabelToKey: Record<string, AbilityKey> = {
  Strength: "strength",
  Dexterity: "dexterity",
  Constitution: "constitution",
  Intelligence: "intelligence",
  Wisdom: "wisdom",
  Charisma: "charisma",
};

const fieldDefinitions: FieldDefinition[] = [
  {
    section: "identity",
    label: "Character Name",
    patchKey: "name",
    aliases: ["character name", "name"],
    kind: "text",
  },
  {
    section: "identity",
    label: "Class",
    patchKey: "className",
    aliases: ["class", "class notes"],
    kind: "text",
  },
  {
    section: "identity",
    label: "Background",
    patchKey: "background",
    aliases: ["background"],
    kind: "text",
  },
  {
    section: "identity",
    label: "Species",
    patchKey: "species",
    aliases: ["species", "ancestry"],
    kind: "text",
  },
  {
    section: "identity",
    label: "Level",
    patchKey: "level",
    aliases: ["level", "character level"],
    kind: "number",
    min: 1,
    max: 20,
  },
  {
    section: "defense",
    label: "Armor Class",
    patchKey: "armorClass",
    aliases: ["armor class", "ac"],
    kind: "number",
    min: 1,
    max: 50,
  },
  {
    section: "movement",
    label: "Speed",
    patchKey: "speed",
    aliases: ["speed", "languages speed", "special movement languages speed"],
    kind: "number",
    min: 0,
    max: 200,
  },
  {
    section: "hitPoints",
    label: "Maximum HP",
    patchKey: "maxHp",
    aliases: ["maximum hp", "max hp", "hit points", "hp maximum", "maximum"],
    kind: "number",
    min: 1,
    max: 999,
  },
  {
    section: "proficiency",
    label: "Proficiency Bonus",
    patchKey: "proficiencyBonus",
    aliases: ["proficiency bonus", "prof bonus"],
    kind: "number",
    min: 0,
    max: 12,
  },
  {
    section: "spellcasting",
    label: "Spell Save DC",
    aliases: ["spell save dc", "spell dc", "class dc"],
    kind: "number",
    min: 1,
    max: 50,
  },
  {
    section: "spellcasting",
    label: "Spell Attack Bonus",
    aliases: ["spell attack bonus", "spell attack"],
    kind: "number",
    min: -10,
    max: 50,
  },
  {
    section: "abilities",
    label: "Strength",
    aliases: ["strength", "str"],
    kind: "ability",
    min: 1,
    max: 30,
  },
  {
    section: "abilities",
    label: "Dexterity",
    aliases: ["dexterity", "dex"],
    kind: "ability",
    min: 1,
    max: 30,
  },
  {
    section: "abilities",
    label: "Constitution",
    aliases: ["constitution", "con"],
    kind: "ability",
    min: 1,
    max: 30,
  },
  {
    section: "abilities",
    label: "Intelligence",
    aliases: ["intelligence", "int"],
    kind: "ability",
    min: 1,
    max: 30,
  },
  {
    section: "abilities",
    label: "Wisdom",
    aliases: ["wisdom", "wis"],
    kind: "ability",
    min: 1,
    max: 30,
  },
  {
    section: "abilities",
    label: "Charisma",
    aliases: ["charisma", "cha"],
    kind: "ability",
    min: 1,
    max: 30,
  },
];

const knownLabels = [
  "character name",
  "player name",
  "class",
  "level",
  "background",
  "species",
  "ancestry",
  "heritage",
  "armor class",
  "hit points",
  "maximum hp",
  "current hp",
  "temporary hp",
  "speed",
  "initiative",
  "proficiency bonus",
  "heroic inspiration",
  "death saves",
  "saving throw",
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
  "acrobatics",
  "arcana",
  "athletics",
  "crafting",
  "deception",
  "diplomacy",
  "intimidation",
  "medicine",
  "nature",
  "occultism",
  "performance",
  "religion",
  "society",
  "stealth",
  "survival",
  "thievery",
  "spell save dc",
  "spell attack",
  "spellcasting ability",
  "equipment",
  "weapons",
  "damage",
  "notes",
];

const badTextValues = new Set([
  "score",
  "modifier",
  "saving throw",
  "heroic inspiration",
  "death saves",
  "hit dice",
  "current",
  "maximum",
  "temporary",
  "class notes",
  "senses and notes",
  "traits and notes",
  "defenses notes",
  "skill notes",
  "notes",
  "base",
  "prof",
  "item",
  "armor",
  "trained",
  "expert",
  "master",
  "legendary",
  "untrained",
]);

const skills = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Crafting",
  "Deception",
  "Diplomacy",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Occultism",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Society",
  "Stealth",
  "Survival",
  "Thievery",
];

const saves = ["Strength Save", "Dexterity Save", "Constitution Save", "Intelligence Save", "Wisdom Save", "Charisma Save", "Fortitude", "Reflex", "Will"];

function makeId(label: string, index: number) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`;
}

function normalizeWhitespace(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function getLines(text: string) {
  return normalizeWhitespace(text)
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function scoreRuleset(text: string): Ruleset {
  const lower = text.toLowerCase();

  const dndMarkers = [
    "heroic inspiration",
    "death saves",
    "hit dice",
    "passive perception",
    "spellcasting ability",
    "cantrips & prepared spells",
    "tm & © 2024 wizards",
    "wizards of the coast",
  ];

  const pf2eMarkers = [
    "pathfinder",
    "paizo",
    "hero points",
    "ancestry",
    "heritage",
    "trained 2 + level",
    "expert 4 + level",
    "master 6 + level",
    "legendary 8 + level",
    "fortitude",
    "reflex",
    "will",
    "class dc",
    "focus points",
  ];

  const dndScore = dndMarkers.reduce((score, marker) => score + (lower.includes(marker) ? 1 : 0), 0);
  const pf2eScore = pf2eMarkers.reduce((score, marker) => score + (lower.includes(marker) ? 1 : 0), 0);

  if (pf2eScore >= dndScore + 2) return "pf2eRemaster";
  if (dndScore >= pf2eScore + 1) return "dnd5e2024";
  if (pf2eScore > dndScore) return "pf2eRemaster";
  if (dndScore > 0) return "dnd5e2024";
  return "unknown";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isKnownLabel(value: string) {
  const lower = value.toLowerCase().trim();
  return knownLabels.some((label) => lower === label || lower.startsWith(`${label} `));
}

function cleanTextValue(value: string) {
  return value
    .replace(/^[:：\-–—|]+/, "")
    .replace(/[•●○□■]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isBadTextValue(value: string) {
  const cleaned = cleanTextValue(value).toLowerCase();
  if (!cleaned) return true;
  if (cleaned.length < 2) return true;
  if (/^[+\-/|.]+$/.test(cleaned)) return true;
  if (/^\d+$/.test(cleaned)) return true;
  if (badTextValues.has(cleaned)) return true;
  if (knownLabels.includes(cleaned)) return true;
  return false;
}

function extractTextAfterAlias(lines: string[], alias: string) {
  const aliasPattern = new RegExp(`\\b${escapeRegExp(alias)}\\b\\s*[:：\\-–—]?\\s*(.+)$`, "i");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(aliasPattern);

    if (match?.[1]) {
      const value = cleanTextValue(match[1]);
      if (!isBadTextValue(value) && !isKnownLabel(value)) {
        return {
          value: value.split(" ").slice(0, 6).join(" "),
          sourceText: line,
          confidence: 0.82,
        };
      }
    }

    if (line.toLowerCase() === alias.toLowerCase()) {
      for (let offset = 1; offset <= 3; offset += 1) {
        const nextLine = lines[index + offset];
        if (!nextLine) continue;

        const value = cleanTextValue(nextLine);
        if (!isBadTextValue(value) && !isKnownLabel(value)) {
          return {
            value: value.split(" ").slice(0, 6).join(" "),
            sourceText: `${line}\n${nextLine}`,
            confidence: offset === 1 ? 0.78 : 0.62,
          };
        }
      }
    }
  }

  return undefined;
}

function extractNumberAfterAlias(lines: string[], alias: string, min: number, max: number) {
  const aliasPattern = new RegExp(`\\b${escapeRegExp(alias)}\\b\\s*[:：\\-–—]?\\s*([+-]?\\d{1,3})\\b`, "i");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lowerLine = line.toLowerCase();

    const inlineMatch = line.match(aliasPattern);
    if (inlineMatch?.[1]) {
      const value = Number(inlineMatch[1]);
      if (value >= min && value <= max && !looksLikeTemplateNumber(line, value)) {
        return {
          value,
          sourceText: line,
          confidence: 0.86,
        };
      }
    }

    if (lowerLine === alias.toLowerCase() || lowerLine.startsWith(`${alias.toLowerCase()} `)) {
      for (let offset = 1; offset <= 3; offset += 1) {
        const nextLine = lines[index + offset];
        if (!nextLine) continue;
        if (isKnownLabel(nextLine)) break;

        const numberMatch = nextLine.match(/[+-]?\d{1,3}/);
        if (!numberMatch) continue;

        const value = Number(numberMatch[0]);
        if (value >= min && value <= max && !looksLikeTemplateNumber(nextLine, value)) {
          return {
            value,
            sourceText: `${line}\n${nextLine}`,
            confidence: offset === 1 ? 0.78 : 0.6,
          };
        }
      }
    }
  }

  return undefined;
}

function looksLikeTemplateNumber(sourceText: string, value: number) {
  const lower = sourceText.toLowerCase();

  if (lower.includes("trained 2 + level")) return true;
  if (lower.includes("expert 4 + level")) return true;
  if (lower.includes("master 6 + level")) return true;
  if (lower.includes("legendary 8 + level")) return true;
  if (lower.includes("base") && lower.includes("prof") && value === 10) return true;
  if (lower.includes("1/2 your level")) return true;
  if (lower.includes("level 1") || lower.includes("level 2") || lower.includes("level 3")) return true;
  if (/20 19 18 17 16 15 14 13 12 11 10/.test(lower)) return true;

  return false;
}

function extractAbility(lines: string[], label: string, min: number, max: number) {
  const aliases = [label, label.slice(0, 3)];
  const modifierWords = ["modifier", "partial boost", "score", "prof", "item"];

  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase();

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const lower = line.toLowerCase();

      if (!new RegExp(`\\b${escapeRegExp(aliasLower)}\\b`, "i").test(lower)) continue;

      const inlineNumbers = line.match(/[+-]?\d{1,2}/g)?.map(Number) ?? [];
      const validInlineScore = inlineNumbers.find((value) => value >= min && value <= max && !looksLikeTemplateNumber(line, value));

      if (validInlineScore !== undefined && !modifierWords.some((word) => lower.includes(word))) {
        return {
          value: validInlineScore,
          sourceText: line,
          confidence: 0.74,
        };
      }

      for (let offset = 1; offset <= 4; offset += 1) {
        const nextLine = lines[index + offset];
        if (!nextLine) continue;
        const nextLower = nextLine.toLowerCase();

        if (knownLabels.some((known) => nextLower === known && known !== aliasLower)) break;
        if (modifierWords.some((word) => nextLower === word)) continue;

        const numberMatch = nextLine.match(/\b\d{1,2}\b/);
        if (!numberMatch) continue;

        const value = Number(numberMatch[0]);
        if (value >= min && value <= max && !looksLikeTemplateNumber(nextLine, value)) {
          return {
            value,
            sourceText: `${line}\n${nextLine}`,
            confidence: offset <= 2 ? 0.72 : 0.56,
          };
        }
      }
    }
  }

  return undefined;
}

function parseField(lines: string[], field: FieldDefinition, index: number): ParsedSheetRow | undefined {
  if (field.kind === "ability") {
    const abilityResult = extractAbility(lines, field.label, field.min ?? 1, field.max ?? 30);
    if (!abilityResult) return undefined;

    return {
      id: makeId(field.label, index),
      section: field.section,
      label: field.label,
      value: abilityResult.value,
      confidence: abilityResult.confidence,
      sourceText: abilityResult.sourceText,
    };
  }

  for (const alias of field.aliases) {
    if (field.kind === "text") {
      const result = extractTextAfterAlias(lines, alias);
      if (!result) continue;

      return {
        id: makeId(field.label, index),
        section: field.section,
        label: field.label,
        value: result.value,
        confidence: result.confidence,
        sourceText: result.sourceText,
      };
    }

    if (field.kind === "number") {
      const result = extractNumberAfterAlias(lines, alias, field.min ?? -999, field.max ?? 999);
      if (!result) continue;

      return {
        id: makeId(field.label, index),
        section: field.section,
        label: field.label,
        value: clamp(result.value, field.min ?? -999, field.max ?? 999),
        confidence: result.confidence,
        sourceText: result.sourceText,
      };
    }
  }

  return undefined;
}

function parsePresenceRows(lines: string[], labels: string[], section: ParsedSheetSection, startingIndex: number) {
  const rows: ParsedSheetRow[] = [];

  for (const [index, label] of labels.entries()) {
    const found = lines.find((line) => new RegExp(`\\b${escapeRegExp(label)}\\b`, "i").test(line));
    if (!found) continue;

    const valueMatch = found.match(new RegExp(`\\b${escapeRegExp(label)}\\b\\s*[:：\\-–—]?\\s*([+-]?\\d{1,3})\\b`, "i"));

    rows.push({
      id: makeId(label, startingIndex + index),
      section,
      label,
      value: valueMatch ? Number(valueMatch[1]) : true,
      confidence: valueMatch ? 0.66 : 0.42,
      sourceText: found,
      notes: valueMatch ? undefined : "Detected label only. Review before applying.",
    });
  }

  return rows;
}

function parseLooseRows(lines: string[], existingLabels: Set<string>) {
  const rows: ParsedSheetRow[] = [];

  for (const [index, line] of lines.entries()) {
    if (!line.includes(":")) continue;

    const [rawLabel, ...rest] = line.split(":");
    const label = cleanTextValue(rawLabel);
    const value = cleanTextValue(rest.join(":"));

    if (!label || !value) continue;
    if (label.length > 34 || value.length > 90) continue;
    if (existingLabels.has(label.toLowerCase())) continue;
    if (isBadTextValue(label) || isBadTextValue(value)) continue;

    rows.push({
      id: makeId(label, index),
      section: "raw",
      label,
      value,
      confidence: 0.45,
      sourceText: line,
      notes: "Loose label/value row. Review before mapping to the character sheet.",
    });
  }

  return rows;
}

function rowsToCharacterPatch(rows: ParsedSheetRow[], ruleset: Ruleset): CharacterPatch {
  const patch: CharacterPatch = {};

  if (ruleset !== "unknown") patch.ruleset = ruleset;

  for (const row of rows) {
    if (row.confidence < 0.58) continue;

    switch (row.label) {
      case "Character Name":
        patch.name = String(row.value);
        break;
      case "Class":
        patch.className = String(row.value);
        break;
      case "Background":
        patch.background = String(row.value);
        break;
      case "Species":
        patch.species = String(row.value);
        break;
      case "Level":
        patch.level = Number(row.value);
        break;
      case "Armor Class":
        patch.armorClass = Number(row.value);
        break;
      case "Speed":
        patch.speed = Number(row.value);
        break;
      case "Maximum HP":
        patch.maxHp = Number(row.value);
        patch.currentHp = Number(row.value);
        break;
      case "Proficiency Bonus":
        patch.proficiencyBonus = Number(row.value);
        break;
      default: {
        const abilityKey = abilityLabelToKey[row.label];
        if (abilityKey) {
          patch.abilities = {
            ...patch.abilities,
            [abilityKey]: Number(row.value),
          };
        }
      }
    }
  }

  return patch;
}

export function parseSheetText(rawText: string): SheetParseResult {
  const normalizedText = normalizeWhitespace(rawText);
  const lines = getLines(normalizedText);
  const ruleset = scoreRuleset(normalizedText);
  const rows: ParsedSheetRow[] = [];

  if (ruleset !== "unknown") {
    rows.push({
      id: "ruleset-0",
      section: "ruleset",
      label: "Ruleset",
      value: ruleset,
      confidence: 0.92,
      sourceText: ruleset === "pf2eRemaster" ? "PF2e markers detected" : "D&D markers detected",
    });
  }

  for (const [index, field] of fieldDefinitions.entries()) {
    const row = parseField(lines, field, index + 1);
    if (row) rows.push(row);
  }

  rows.push(...parsePresenceRows(lines, skills, "skills", 1000));
  rows.push(...parsePresenceRows(lines, saves, "saves", 2000));

  const existingLabels = new Set(rows.map((row) => row.label.toLowerCase()));
  rows.push(...parseLooseRows(lines, existingLabels));

  const uniqueRows = dedupeRows(rows);
  const patch = rowsToCharacterPatch(uniqueRows, ruleset);
  const warnings: string[] = [];

  if (ruleset === "unknown") {
    warnings.push("Ruleset could not be confidently detected. Choose D&D or PF2e before applying.");
  }

  const highConfidencePatchRows = uniqueRows.filter((row) => row.confidence >= 0.58 && row.section !== "ruleset");
  if (highConfidencePatchRows.length < 3) {
    warnings.push("Low-confidence import. This may be a blank sheet, scanned sheet, or PDF with unusual field ordering.");
  }

  if (!patch.name) {
    warnings.push("Character name was not confidently detected.");
  }

  if (uniqueRows.some((row) => row.confidence < 0.5)) {
    warnings.push("Some rows were detected as labels only and should be reviewed before applying.");
  }

  return {
    rows: uniqueRows.sort((a, b) => {
      const sectionCompare = sectionRank(a.section) - sectionRank(b.section);
      if (sectionCompare !== 0) return sectionCompare;
      return b.confidence - a.confidence;
    }),
    patch,
    ruleset,
    warnings,
    normalizedText,
  };
}

function dedupeRows(rows: ParsedSheetRow[]) {
  const bestByLabel = new Map<string, ParsedSheetRow>();

  for (const row of rows) {
    const key = `${row.section}:${row.label}`.toLowerCase();
    const existing = bestByLabel.get(key);

    if (!existing || row.confidence > existing.confidence) {
      bestByLabel.set(key, row);
    }
  }

  return Array.from(bestByLabel.values());
}

function sectionRank(section: ParsedSheetSection) {
  const order: ParsedSheetSection[] = [
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

  return order.indexOf(section);
}

export function rowsBySection(rows: ParsedSheetRow[]) {
  return rows.reduce<Record<ParsedSheetSection, ParsedSheetRow[]>>(
    (sections, row) => {
      sections[row.section].push(row);
      return sections;
    },
    {
      identity: [],
      ruleset: [],
      defense: [],
      hitPoints: [],
      movement: [],
      abilities: [],
      proficiency: [],
      spellcasting: [],
      weapons: [],
      skills: [],
      saves: [],
      raw: [],
    },
  );
}