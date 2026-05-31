import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Crosshair,
  Dices,
  Download,
  FileText,
  Heart,
  History,
  Minus,
  Plus,
  RotateCcw,
  Save,
  ScrollText,
  Shield,
  Sparkles,
  Sword,
  Trash2,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import { recognize } from "tesseract.js";
import SheetImportReview from "./SheetImportReview";
import { parseSheetText, type CharacterPatch, type SheetParseResult } from "./sheetParser";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type AbilityKey = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

type SkillKey =
  | "acrobatics"
  | "animalHandling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleightOfHand"
  | "stealth"
  | "survival";

type Ruleset = "dnd5e2024" | "pf2eRemaster";
type AbilityScores = Record<AbilityKey, number>;
type SkillProficiencies = Record<SkillKey, boolean>;
type SaveProficiencies = Record<AbilityKey, boolean>;

type Weapon = {
  id: string;
  name: string;
  ability: AbilityKey;
  damageDice: string;
  damageBonusAbility: boolean;
  proficient: boolean;
};

type Spell = {
  id: string;
  name: string;
  rank: number;
  tradition: string;
  castingTime: string;
  range: string;
  attackRoll: boolean;
  savingThrow: boolean;
  saveAbility: AbilityKey;
  damageDice: string;
  notes: string;
};

type Character = {
  ruleset: Ruleset;
  name: string;
  className: string;
  background: string;
  species: string;
  level: number;
  armorClass: number;
  speed: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  proficiencyBonus: number;
  spellcastingAbility: AbilityKey;
  abilities: AbilityScores;
  skillProficiencies: SkillProficiencies;
  savingThrowProficiencies: SaveProficiencies;
  weapons: Weapon[];
  spells: Spell[];
};

type RollBreakdownLine = {
  label: string;
  value: number;
};

type RollResult = {
  id: string;
  timestamp: number;
  title: string;
  diceNotation: string;
  diceResults: number[];
  breakdown: RollBreakdownLine[];
  total: number;
  natural?: number;
};

type ImportReport = {
  fileName: string;
  kind: "json" | "pdf" | "image";
  fieldsFound: string[];
  warnings: string[];
  pagesRead?: number;
  extractedText?: string;
};

const STORAGE_KEY = "tabletop-character-roller-v4";

const abilityLabels: Record<AbilityKey, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

const abilityShortLabels: Record<AbilityKey, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const skillConfig: Record<SkillKey, { label: string; ability: AbilityKey }> = {
  acrobatics: { label: "Acrobatics", ability: "dexterity" },
  animalHandling: { label: "Animal Handling", ability: "wisdom" },
  arcana: { label: "Arcana", ability: "intelligence" },
  athletics: { label: "Athletics", ability: "strength" },
  deception: { label: "Deception", ability: "charisma" },
  history: { label: "History", ability: "intelligence" },
  insight: { label: "Insight", ability: "wisdom" },
  intimidation: { label: "Intimidation", ability: "charisma" },
  investigation: { label: "Investigation", ability: "intelligence" },
  medicine: { label: "Medicine", ability: "wisdom" },
  nature: { label: "Nature", ability: "intelligence" },
  perception: { label: "Perception", ability: "wisdom" },
  performance: { label: "Performance", ability: "charisma" },
  persuasion: { label: "Persuasion", ability: "charisma" },
  religion: { label: "Religion", ability: "intelligence" },
  sleightOfHand: { label: "Sleight of Hand", ability: "dexterity" },
  stealth: { label: "Stealth", ability: "dexterity" },
  survival: { label: "Survival", ability: "wisdom" },
};

const abilityKeys = Object.keys(abilityLabels) as AbilityKey[];
const skillKeys = Object.keys(skillConfig) as SkillKey[];

const emptySkills = skillKeys.reduce((accumulator, skill) => {
  accumulator[skill] = false;
  return accumulator;
}, {} as SkillProficiencies);

const emptySaves = abilityKeys.reduce((accumulator, ability) => {
  accumulator[ability] = false;
  return accumulator;
}, {} as SaveProficiencies);

const sampleCharacter: Character = {
  ruleset: "dnd5e2024",
  name: "Kael Thornwhisper",
  className: "Rogue",
  background: "Wayfarer",
  species: "Elf",
  level: 3,
  armorClass: 15,
  speed: 30,
  maxHp: 24,
  currentHp: 24,
  tempHp: 0,
  proficiencyBonus: 2,
  spellcastingAbility: "intelligence",
  abilities: {
    strength: 10,
    dexterity: 16,
    constitution: 14,
    intelligence: 12,
    wisdom: 13,
    charisma: 8,
  },
  skillProficiencies: {
    ...emptySkills,
    acrobatics: true,
    perception: true,
    sleightOfHand: true,
    stealth: true,
  },
  savingThrowProficiencies: {
    ...emptySaves,
    dexterity: true,
    intelligence: true,
  },
  weapons: [
    {
      id: "weapon-shortsword",
      name: "Shortsword",
      ability: "dexterity",
      damageDice: "1d6",
      damageBonusAbility: true,
      proficient: true,
    },
    {
      id: "weapon-shortbow",
      name: "Shortbow",
      ability: "dexterity",
      damageDice: "1d6",
      damageBonusAbility: true,
      proficient: true,
    },
  ],
  spells: [
    {
      id: "spell-fire-bolt",
      name: "Fire Bolt",
      rank: 0,
      tradition: "Arcane",
      castingTime: "1 Action",
      range: "120 ft",
      attackRoll: true,
      savingThrow: false,
      saveAbility: "dexterity",
      damageDice: "1d10",
      notes: "Ranged spell attack.",
    },
    {
      id: "spell-burning-hands",
      name: "Burning Hands",
      rank: 1,
      tradition: "Arcane",
      castingTime: "1 Action",
      range: "Self",
      attackRoll: false,
      savingThrow: true,
      saveAbility: "dexterity",
      damageDice: "3d6",
      notes: "Creatures in the area make a save.",
    },
  ],
};

function normalizeCharacter(input: Partial<Character> | { character?: Partial<Character> } | null): Character {
  let safeSource: Partial<Character> = {};

  if (input && typeof input === "object") {
    const maybeWrapped = input as { character?: Partial<Character> };

    if (maybeWrapped.character && typeof maybeWrapped.character === "object") {
      safeSource = maybeWrapped.character;
    } else {
      safeSource = input as Partial<Character>;
    }
  }

  return {
    ...sampleCharacter,
    ...safeSource,
    ruleset: safeSource.ruleset === "pf2eRemaster" ? "pf2eRemaster" : "dnd5e2024",
    spellcastingAbility: abilityKeys.includes(safeSource.spellcastingAbility as AbilityKey)
      ? (safeSource.spellcastingAbility as AbilityKey)
      : sampleCharacter.spellcastingAbility,
    abilities: {
      ...sampleCharacter.abilities,
      ...safeSource.abilities,
    },
    skillProficiencies: {
      ...emptySkills,
      ...safeSource.skillProficiencies,
    },
    savingThrowProficiencies: {
      ...emptySaves,
      ...safeSource.savingThrowProficiencies,
    },
    weapons: Array.isArray(safeSource.weapons) ? safeSource.weapons : sampleCharacter.weapons,
    spells: Array.isArray(safeSource.spells) ? safeSource.spells : sampleCharacter.spells,
  };
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatModifier(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

function getModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function getRulesetName(ruleset: Ruleset) {
  return ruleset === "pf2eRemaster" ? "Pathfinder 2e Remaster" : "D&D 2024 / 5.5";
}

function getRulesetShortName(ruleset: Ruleset) {
  return ruleset === "pf2eRemaster" ? "PF2e" : "D&D";
}

function getProficiencyLabel(ruleset: Ruleset) {
  return ruleset === "pf2eRemaster" ? "Trained" : "Proficient";
}

function getSystemProficiencyBonus(character: Character, isProficient: boolean) {
  if (!isProficient) return 0;
  return character.ruleset === "pf2eRemaster" ? character.level + 2 : character.proficiencyBonus;
}

function getBaseDcLabel(ruleset: Ruleset) {
  return ruleset === "pf2eRemaster" ? "Perception DC" : "Passive Perception";
}

function getSpellSaveDc(character: Character) {
  const abilityModifier = getModifier(character.abilities[character.spellcastingAbility]);
  const proficiency = getSystemProficiencyBonus(character, true);
  const base = character.ruleset === "pf2eRemaster" ? 10 : 8;
  return base + abilityModifier + proficiency;
}

function getSpellAttackBonus(character: Character) {
  const abilityModifier = getModifier(character.abilities[character.spellcastingAbility]);
  const proficiency = getSystemProficiencyBonus(character, true);
  return abilityModifier + proficiency;
}

function rollDie(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(count: number, sides: number) {
  return Array.from({ length: count }, () => rollDie(sides));
}

function parseDiceNotation(notation: string) {
  const compact = notation.toLowerCase().replaceAll(" ", "");
  const dIndex = compact.indexOf("d");

  if (dIndex < 0) return { count: 1, sides: 20, flatBonus: 0 };

  const countText = compact.slice(0, dIndex);
  const afterD = compact.slice(dIndex + 1);
  const plusIndex = afterD.indexOf("+");
  const minusIndex = afterD.indexOf("-");
  const bonusIndex = plusIndex >= 0 ? plusIndex : minusIndex;
  const sidesText = bonusIndex >= 0 ? afterD.slice(0, bonusIndex) : afterD;
  const bonusText = bonusIndex >= 0 ? afterD.slice(bonusIndex) : "0";
  const count = countText === "" ? 1 : Number(countText);
  const sides = Number(sidesText);
  const flatBonus = Number(bonusText);

  if (!Number.isFinite(count) || !Number.isFinite(sides) || !Number.isFinite(flatBonus)) {
    return { count: 1, sides: 20, flatBonus: 0 };
  }

  return {
    count: clampNumber(count, 1, 50),
    sides: clampNumber(sides, 2, 1000),
    flatBonus: clampNumber(flatBonus, -999, 999),
  };
}

function rollNotation(notation: string) {
  const parsed = parseDiceNotation(notation);
  const diceResults = rollDice(parsed.count, parsed.sides);
  const diceTotal = diceResults.reduce((sum, value) => sum + value, 0);

  return {
    ...parsed,
    diceResults,
    diceTotal,
    total: diceTotal + parsed.flatBonus,
  };
}

function makeResult(args: {
  title: string;
  diceNotation: string;
  diceResults: number[];
  breakdown: RollBreakdownLine[];
  natural?: number;
}): RollResult {
  return {
    id: createId("roll"),
    timestamp: Date.now(),
    title: args.title,
    diceNotation: args.diceNotation,
    diceResults: args.diceResults,
    breakdown: args.breakdown,
    total: args.breakdown.reduce((sum, line) => sum + line.value, 0),
    natural: args.natural,
  };
}

function makeD20Result(title: string, baseRoll: number, bonusLines: RollBreakdownLine[]) {
  return makeResult({
    title,
    diceNotation: "1d20",
    diceResults: [baseRoll],
    natural: baseRoll,
    breakdown: [{ label: "d20", value: baseRoll }, ...bonusLines],
  });
}

function NumberInput({
  value,
  onChange,
  min = -999,
  max = 999,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(clampNumber(Number(event.target.value), min, max))}
      className={`w-full border border-stone-400 bg-white px-2 py-1.5 text-sm font-semibold outline-none transition focus:border-emerald-950 ${className}`}
    />
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full border border-stone-400 bg-white px-2 py-1.5 text-sm font-semibold outline-none transition focus:border-emerald-950 ${className}`}
    />
  );
}

function SheetCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Card className={`sheet-card rounded-sm border-2 border-stone-600 bg-stone-50 shadow-sm ${className}`}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center border-2 border-emerald-950 bg-stone-100 text-emerald-950">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="whitespace-nowrap font-serif text-base font-black uppercase tracking-wider text-emerald-950">
            {title}
          </h2>
          <div className="h-[3px] flex-1 bg-emerald-950" />
        </div>
        {subtitle ? <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function SheetField({ label, value }: { label: string | number; value: string | number }) {
  return (
    <div className="min-w-0 overflow-hidden border-2 border-stone-500 bg-stone-50 p-2 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]">
      <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-stone-500">{label}</div>
      <div className="mt-1 truncate font-serif text-xl font-black leading-none text-stone-950 sm:text-2xl">{value}</div>
    </div>
  );
}

function ProficiencyDot({ active }: { active: boolean }) {
  const classes = active ? "border-emerald-950 bg-emerald-950" : "border-stone-500 bg-stone-50";
  return <span className={`h-3 w-3 rounded-full border-2 ${classes}`} />;
}

function SheetCss() {
  return (
    <style>{`
      body {
        background: rgb(245 245 244);
      }

      .sheet-bg {
        background-image:
          radial-gradient(circle at top left, rgba(68, 64, 60, 0.16), transparent 30rem),
          linear-gradient(rgba(68, 64, 60, 0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(68, 64, 60, 0.045) 1px, transparent 1px);
        background-size: auto, 18px 18px, 18px 18px;
      }

      .sheet-card {
        background: rgba(255, 252, 242, 0.96) !important;
        box-shadow: 0 12px 30px rgba(41, 37, 36, 0.08), inset 0 0 0 1px rgba(255,255,255,0.75) !important;
      }

      .sheet-card input,
      .sheet-card select {
        border-radius: 0 !important;
      }

      .sheet-card button {
        border-radius: 0 !important;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 0.72rem;
        font-weight: 900;
      }

      .sheet-lines {
        background-image: linear-gradient(rgba(87,83,78,.20) 1px, transparent 1px);
        background-size: 100% 28px;
      }
    `}</style>
  );
}

export default function TabletopCharacterRollerApp() {
  const [character, setCharacter] = useState<Character>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeCharacter(JSON.parse(saved)) : sampleCharacter;
    } catch {
      return sampleCharacter;
    }
  });

  const [rollHistory, setRollHistory] = useState<RollResult[]>([]);
  const [activeRoll, setActiveRoll] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [manualNotation, setManualNotation] = useState("1d20");
  const [previewDieNumber, setPreviewDieNumber] = useState(20);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [pendingImport, setPendingImport] = useState<SheetParseResult | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const passivePerception = useMemo(() => {
    const wisdomModifier = getModifier(character.abilities.wisdom);
    const proficiency = getSystemProficiencyBonus(character, character.skillProficiencies.perception);
    return 10 + wisdomModifier + proficiency;
  }, [character]);

  const hpPercentage = Math.round((character.currentHp / Math.max(character.maxHp, 1)) * 100);
  const spellSaveDc = getSpellSaveDc(character);
  const spellAttackBonus = getSpellAttackBonus(character);
  const proficiencyValue = character.ruleset === "pf2eRemaster" ? character.level + 2 : character.proficiencyBonus;

  const nonZeroModifierLines = activeRoll
    ? activeRoll.breakdown
        .filter((line) => line.label.toLowerCase() !== "d20" && line.value !== 0)
        .sort((first, second) => second.value - first.value)
    : [];

  useEffect(() => {
    if (!isRolling) return undefined;

    const interval = window.setInterval(() => setPreviewDieNumber(rollDie(20)), 55);
    return () => window.clearInterval(interval);
  }, [isRolling]);

  function updateCharacter(patch: Partial<Character>) {
    setCharacter((current) => ({ ...current, ...patch }));
  }

  function updateAbility(ability: AbilityKey, value: number) {
    setCharacter((current) => ({
      ...current,
      abilities: {
        ...current.abilities,
        [ability]: value,
      },
    }));
  }

  function updateSkillProficiency(skill: SkillKey, value: boolean) {
    setCharacter((current) => ({
      ...current,
      skillProficiencies: {
        ...current.skillProficiencies,
        [skill]: value,
      },
    }));
  }

  function updateSaveProficiency(ability: AbilityKey, value: boolean) {
    setCharacter((current) => ({
      ...current,
      savingThrowProficiencies: {
        ...current.savingThrowProficiencies,
        [ability]: value,
      },
    }));
  }

  function updateWeapon(id: string, patch: Partial<Weapon>) {
    setCharacter((current) => ({
      ...current,
      weapons: current.weapons.map((weapon) => (weapon.id === id ? { ...weapon, ...patch } : weapon)),
    }));
  }

  function addWeapon() {
    setCharacter((current) => ({
      ...current,
      weapons: [
        ...current.weapons,
        {
          id: createId("weapon"),
          name: "New Weapon",
          ability: "strength",
          damageDice: "1d8",
          damageBonusAbility: true,
          proficient: true,
        },
      ],
    }));
  }

  function removeWeapon(id: string) {
    setCharacter((current) => ({
      ...current,
      weapons: current.weapons.filter((weapon) => weapon.id !== id),
    }));
  }

  function updateSpell(id: string, patch: Partial<Spell>) {
    setCharacter((current) => ({
      ...current,
      spells: current.spells.map((spell) => (spell.id === id ? { ...spell, ...patch } : spell)),
    }));
  }

  function addSpell() {
    setCharacter((current) => ({
      ...current,
      spells: [
        ...current.spells,
        {
          id: createId("spell"),
          name: "New Spell",
          rank: 1,
          tradition: "Arcane",
          castingTime: "1 Action",
          range: "60 ft",
          attackRoll: true,
          savingThrow: false,
          saveAbility: "dexterity",
          damageDice: "1d8",
          notes: "Add spell notes here.",
        },
      ],
    }));
  }

  function removeSpell(id: string) {
    setCharacter((current) => ({
      ...current,
      spells: current.spells.filter((spell) => spell.id !== id),
    }));
  }

  function commitRoll(result: RollResult) {
    setActiveRoll(result);
    setRollHistory((current) => [result, ...current].slice(0, 30));
  }

  function animateAndCommit(makeRoll: () => RollResult) {
    setIsRolling(true);

    window.setTimeout(() => {
      const result = makeRoll();
      setPreviewDieNumber(result.natural ?? result.diceResults[0] ?? result.total);
      commitRoll(result);
      setIsRolling(false);
    }, 750);
  }

  function rollAbilityCheck(ability: AbilityKey) {
    animateAndCommit(() =>
      makeD20Result(`${abilityLabels[ability]} Check`, rollDie(20), [
        {
          label: `${abilityShortLabels[ability]} modifier`,
          value: getModifier(character.abilities[ability]),
        },
      ]),
    );
  }

  function rollSavingThrow(ability: AbilityKey) {
    animateAndCommit(() =>
      makeD20Result(`${abilityLabels[ability]} Saving Throw`, rollDie(20), [
        {
          label: `${abilityShortLabels[ability]} modifier`,
          value: getModifier(character.abilities[ability]),
        },
        {
          label: getProficiencyLabel(character.ruleset),
          value: getSystemProficiencyBonus(character, character.savingThrowProficiencies[ability]),
        },
      ]),
    );
  }

  function rollSkill(skill: SkillKey) {
    animateAndCommit(() => {
      const skillData = skillConfig[skill];

      return makeD20Result(`${skillData.label} Check`, rollDie(20), [
        {
          label: `${abilityShortLabels[skillData.ability]} modifier`,
          value: getModifier(character.abilities[skillData.ability]),
        },
        {
          label: getProficiencyLabel(character.ruleset),
          value: getSystemProficiencyBonus(character, character.skillProficiencies[skill]),
        },
      ]);
    });
  }

  function rollInitiative() {
    animateAndCommit(() =>
      makeD20Result("Initiative", rollDie(20), [
        {
          label: "DEX modifier",
          value: getModifier(character.abilities.dexterity),
        },
      ]),
    );
  }

  function rollWeaponAttack(weapon: Weapon) {
    animateAndCommit(() =>
      makeD20Result(`${weapon.name} Attack`, rollDie(20), [
        {
          label: `${abilityShortLabels[weapon.ability]} modifier`,
          value: getModifier(character.abilities[weapon.ability]),
        },
        {
          label: getProficiencyLabel(character.ruleset),
          value: getSystemProficiencyBonus(character, weapon.proficient),
        },
      ]),
    );
  }

  function rollWeaponDamage(weapon: Weapon) {
    animateAndCommit(() => {
      const rolled = rollNotation(weapon.damageDice);
      const abilityBonus = weapon.damageBonusAbility ? getModifier(character.abilities[weapon.ability]) : 0;

      return makeResult({
        title: `${weapon.name} Damage`,
        diceNotation: weapon.damageDice,
        diceResults: rolled.diceResults,
        breakdown: [
          { label: weapon.damageDice, value: rolled.diceTotal },
          { label: `${abilityShortLabels[weapon.ability]} modifier`, value: abilityBonus },
          ...(rolled.flatBonus !== 0 ? [{ label: "Flat dice bonus", value: rolled.flatBonus }] : []),
        ],
      });
    });
  }

  function rollSpellAttack(spell: Spell) {
    animateAndCommit(() =>
      makeD20Result(`${spell.name} Spell Attack`, rollDie(20), [
        {
          label: `${abilityShortLabels[character.spellcastingAbility]} modifier + spell proficiency`,
          value: getSpellAttackBonus(character),
        },
      ]),
    );
  }

  function rollSpellDamage(spell: Spell) {
    animateAndCommit(() => {
      const rolled = rollNotation(spell.damageDice);

      return makeResult({
        title: `${spell.name} Damage`,
        diceNotation: spell.damageDice,
        diceResults: rolled.diceResults,
        breakdown: [
          { label: spell.damageDice, value: rolled.diceTotal },
          ...(rolled.flatBonus !== 0 ? [{ label: "Flat bonus", value: rolled.flatBonus }] : []),
        ],
      });
    });
  }

  function rollManualDice() {
    animateAndCommit(() => {
      const rolled = rollNotation(manualNotation);

      return makeResult({
        title: `Manual Roll: ${manualNotation}`,
        diceNotation: manualNotation,
        diceResults: rolled.diceResults,
        breakdown: [
          { label: manualNotation, value: rolled.diceTotal },
          ...(rolled.flatBonus !== 0 ? [{ label: "Flat bonus", value: rolled.flatBonus }] : []),
        ],
      });
    });
  }

  function saveCharacter() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
  }

  function resetCharacter() {
    localStorage.removeItem(STORAGE_KEY);
    setCharacter(sampleCharacter);
    setRollHistory([]);
    setActiveRoll(null);
    setImportReport(null);
    setPendingImport(null);
    setOcrProgress(0);
  }

  function exportCharacterJson() {
    const exportData = {
      app: "tabletop-character-roller",
      version: 4,
      exportedAt: new Date().toISOString(),
      character,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(character.name || "character").toLowerCase().replaceAll(" ", "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importCharacterJson(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<Character> | { character?: Partial<Character> };
    setCharacter(normalizeCharacter(parsed));
    setPendingImport(null);
    setImportReport({
      fileName: file.name,
      kind: "json",
      fieldsFound: ["Full character JSON"],
      warnings: [],
    });
  }

  async function applyParsedText(fileName: string, kind: "pdf" | "image", text: string, pagesRead?: number) {
    const parsed = parseSheetText(text);

    setPendingImport(parsed);

    setImportReport({
      fileName,
      kind,
      fieldsFound: parsed.rows.map((row) => row.label),
      warnings: parsed.warnings,
      pagesRead,
      extractedText: parsed.normalizedText.slice(0, 1200),
    });
  }

  function applyReviewedImport(patch: CharacterPatch) {
    setCharacter((current) => {
      const abilities: AbilityScores = {
        strength: patch.abilities?.strength ?? current.abilities.strength,
        dexterity: patch.abilities?.dexterity ?? current.abilities.dexterity,
        constitution: patch.abilities?.constitution ?? current.abilities.constitution,
        intelligence: patch.abilities?.intelligence ?? current.abilities.intelligence,
        wisdom: patch.abilities?.wisdom ?? current.abilities.wisdom,
        charisma: patch.abilities?.charisma ?? current.abilities.charisma,
      };

      return normalizeCharacter({
        ...current,
        ruleset: patch.ruleset ?? current.ruleset,
        name: patch.name ?? current.name,
        className: patch.className ?? current.className,
        background: patch.background ?? current.background,
        species: patch.species ?? current.species,
        level: patch.level ?? current.level,
        armorClass: patch.armorClass ?? current.armorClass,
        speed: patch.speed ?? current.speed,
        maxHp: patch.maxHp ?? current.maxHp,
        currentHp: patch.currentHp ?? current.currentHp,
        proficiencyBonus: patch.proficiencyBonus ?? current.proficiencyBonus,
        spellcastingAbility: abilityKeys.includes(patch.spellcastingAbility as AbilityKey)
          ? (patch.spellcastingAbility as AbilityKey)
          : current.spellcastingAbility,
        abilities,
      });
    });

    setPendingImport(null);

    setImportReport((current) =>
      current
        ? {
            ...current,
            warnings: current.warnings.length ? current.warnings : ["Reviewed import applied."],
          }
        : current,
    );
  }

  async function importPdfCharacterSheet(file: File) {
    setIsImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const pageTexts: string[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();

        type PdfTextItem = {
          str?: string;
          transform?: number[];
          width?: number;
          height?: number;
        };

        const items = textContent.items as PdfTextItem[];

        const positionedItems = items
          .map((item) => ({
            text: (item.str ?? "").trim(),
            x: item.transform?.[4] ?? 0,
            y: item.transform?.[5] ?? 0,
          }))
          .filter((item) => item.text.length > 0)
          .sort((a, b) => {
            const yDifference = b.y - a.y;
            if (Math.abs(yDifference) > 3) return yDifference;
            return a.x - b.x;
          });

        const lines: string[] = [];

        for (let index = 0; index < positionedItems.length; index += 1) {
          const item = positionedItems[index];
          const previous = positionedItems[index - 1];

          if (!previous || Math.abs(previous.y - item.y) > 3) {
            lines.push(item.text);
          } else {
            lines[lines.length - 1] = `${lines[lines.length - 1]} ${item.text}`;
          }
        }

        pageTexts.push(lines.join("\n"));
      }

      await applyParsedText(file.name, "pdf", pageTexts.join("\n\n"), pdf.numPages);
    } finally {
      setIsImporting(false);
    }
  }

  async function importImageCharacterSheet(file: File) {
    setIsImporting(true);
    setOcrProgress(0);

    try {
      const result = await recognize(file, "eng", {
        logger: (message: { status?: string; progress?: number }) => {
          if (typeof message.progress === "number") {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      } as any);

      await applyParsedText(file.name, "image", result.data.text, undefined);
    } catch (error) {
      setImportReport({
        fileName: file.name,
        kind: "image",
        fieldsFound: [],
        warnings: [`Image OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`],
      });
    } finally {
      setIsImporting(false);
    }
  }

  async function handleJsonFileChange(file: File | undefined) {
    if (!file) return;

    try {
      await importCharacterJson(file);
    } catch (error) {
      setImportReport({
        fileName: file.name,
        kind: "json",
        fieldsFound: [],
        warnings: [`JSON import failed: ${error instanceof Error ? error.message : "Unknown error"}`],
      });
    }
  }

  async function handlePdfFileChange(file: File | undefined) {
    if (file) await importPdfCharacterSheet(file);
  }

  async function handleImageFileChange(file: File | undefined) {
    if (file) await importImageCharacterSheet(file);
  }

  return (
    <div className="sheet-bg min-h-screen text-stone-950">
      <SheetImportReview result={pendingImport} onApply={applyReviewedImport} onCancel={() => setPendingImport(null)} />

      <SheetCss />

      <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <main className="grid gap-0 xl:grid-cols-[minmax(0,7fr)_6px_minmax(420px,3fr)]">     <section className="space-y-6 pr-0 xl:pr-8">
            <header className="sheet-card overflow-hidden rounded-sm border-2 border-stone-600 bg-stone-50">
                <div className="grid gap-0">
                  <div className="border-b-2 border-stone-600 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div>
                      <h1 className="font-serif text-2xl font-black uppercase tracking-wider text-emerald-950 sm:text-3xl">
                        Adventurer Sheet
                      </h1>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">
                        {getRulesetName(character.ruleset)}
                      </p>
                    </div>
                    <div className="h-[3px] flex-1 bg-emerald-950" />
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[170px_1fr_90px]">
                    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
                      Ruleset
                      <select
                        value={character.ruleset}
                        onChange={(event) => updateCharacter({ ruleset: event.target.value as Ruleset })}
                        className="mt-1 w-full border border-stone-400 bg-white px-2 py-1.5 text-sm font-black uppercase tracking-wide outline-none focus:border-emerald-950"
                      >
                        <option value="dnd5e2024">D&D 2024 / 5.5</option>
                        <option value="pf2eRemaster">Pathfinder 2e Remaster</option>
                      </select>
                    </label>

                    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
                      Character Name
                      <TextInput
                        value={character.name}
                        onChange={(name) => updateCharacter({ name })}
                        className="mt-1 font-serif text-xl font-black"
                      />
                    </label>

                    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
                      Level
                      <NumberInput
                        value={character.level}
                        min={1}
                        max={20}
                        onChange={(level) => updateCharacter({ level })}
                        className="mt-1 text-center font-serif text-xl font-black"
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
                      Class
                      <TextInput value={character.className} onChange={(className) => updateCharacter({ className })} className="mt-1" />
                    </label>

                    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
                      Background
                      <TextInput value={character.background} onChange={(background) => updateCharacter({ background })} className="mt-1" />
                    </label>

                    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
                      Species
                      <TextInput value={character.species} onChange={(species) => updateCharacter({ species })} className="mt-1" />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
                  <div className="border-b-2 border-r-2 border-stone-600 p-3">
                    <SheetField label="Armor Class" value={character.armorClass} />
                  </div>
                  <div className="border-b-2 border-r-2 border-stone-600 p-3 xl:border-r-0">
                    <SheetField label="Initiative" value={formatModifier(getModifier(character.abilities.dexterity))} />
                  </div>
                  <div className="border-b-2 border-r-2 border-stone-600 p-3">
                    <SheetField label="Speed" value={`${character.speed} ft`} />
                  </div>
                  <div className="border-b-2 border-stone-600 p-3">
                    <SheetField label={getBaseDcLabel(character.ruleset)} value={passivePerception} />
                  </div>
                  <div className="border-b-2 border-r-2 border-stone-600 p-3">
                    <SheetField
                      label={character.ruleset === "pf2eRemaster" ? "Trained Bonus" : "Prof. Bonus"}
                      value={formatModifier(proficiencyValue)}
                    />
                  </div>
                  <div className="border-b-2 border-r-2 border-stone-600 p-3 xl:border-r-0">
                    <SheetField label="HP" value={`${character.currentHp}/${character.maxHp}`} />
                  </div>
                  <div className="border-r-2 border-stone-600 p-3">
                    <SheetField label="Spell DC" value={spellSaveDc} />
                  </div>
                  <div className="p-3">
                    <SheetField label="Spell Attack" value={formatModifier(spellAttackBonus)} />
                  </div>
                </div>
              </div>
            </header>

            <div className="grid gap-6">
              <div className="space-y-6">
                <SheetCard>
                  <SectionTitle
                    icon={User}
                    title="Character"
                    subtitle={`${getRulesetShortName(character.ruleset)} mode, defenses, and hit points`}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                      Armor Class
                      <NumberInput
                        value={character.armorClass}
                        min={1}
                        max={40}
                        onChange={(armorClass) => updateCharacter({ armorClass })}
                      />
                    </label>

                    <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                      Speed
                      <NumberInput value={character.speed} min={0} max={200} onChange={(speed) => updateCharacter({ speed })} />
                    </label>

                    <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                      Proficiency
                      <NumberInput
                        value={character.proficiencyBonus}
                        min={0}
                        max={12}
                        onChange={(proficiencyBonus) => updateCharacter({ proficiencyBonus })}
                      />
                      <span className="mt-1 block text-[10px] font-bold normal-case tracking-normal text-stone-500">
                        {character.ruleset === "pf2eRemaster"
                          ? `Trained = level + 2 = ${formatModifier(character.level + 2)}`
                          : "Used for proficient D&D rolls"}
                      </span>
                    </label>

                    <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                      Max HP
                      <NumberInput
                        value={character.maxHp}
                        min={1}
                        max={999}
                        onChange={(maxHp) =>
                          updateCharacter({
                            maxHp,
                            currentHp: Math.min(character.currentHp, maxHp),
                          })
                        }
                      />
                    </label>

                    <label className="col-span-2 block text-[10px] font-black uppercase tracking-wide text-stone-500">
                      Spellcasting Ability
                      <select
                        value={character.spellcastingAbility}
                        onChange={(event) => updateCharacter({ spellcastingAbility: event.target.value as AbilityKey })}
                        className="w-full border border-stone-400 bg-white px-2 py-1.5 text-sm font-semibold outline-none focus:border-emerald-950"
                      >
                        {abilityKeys.map((ability) => (
                          <option key={ability} value={ability}>
                            {abilityLabels[ability]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 border-2 border-stone-500 bg-white/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-serif font-black uppercase text-emerald-950">
                        <Heart className="h-4 w-4" /> Hit Points
                      </div>
                      <div className="font-serif text-xl font-black">
                        {character.currentHp}/{character.maxHp}
                      </div>
                    </div>

                    <div className="mb-3 h-3 overflow-hidden border border-stone-500 bg-stone-200">
                      <div
                        className="h-full bg-emerald-950 transition-all"
                        style={{ width: `${clampNumber(hpPercentage, 0, 100)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                      <Button
                        variant="outline"
                        onClick={() => updateCharacter({ currentHp: Math.max(0, character.currentHp - 1) })}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>

                      <NumberInput
                        value={character.currentHp}
                        min={0}
                        max={character.maxHp}
                        onChange={(currentHp) => updateCharacter({ currentHp })}
                      />

                      <Button
                        variant="outline"
                        onClick={() => updateCharacter({ currentHp: Math.min(character.maxHp, character.currentHp + 1) })}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <label className="mt-3 block text-[10px] font-black uppercase tracking-wide text-stone-500">
                      Temporary HP
                      <NumberInput value={character.tempHp} min={0} max={999} onChange={(tempHp) => updateCharacter({ tempHp })} />
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button onClick={saveCharacter}>
                      <Save className="mr-2 h-4 w-4" /> Save
                    </Button>

                    <Button onClick={resetCharacter} variant="outline">
                      <RotateCcw className="mr-2 h-4 w-4" /> Reset
                    </Button>
                  </div>
                </SheetCard>

                <SheetCard>
                  <SectionTitle icon={FileText} title="Import / Export" subtitle="JSON, PDF text, and image OCR" />

                  <input
                    ref={jsonInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => void handleJsonFileChange(event.target.files?.[0])}
                  />

                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(event) => void handlePdfFileChange(event.target.files?.[0])}
                  />

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => void handleImageFileChange(event.target.files?.[0])}
                  />

                  <div className="grid gap-2">
                    <Button onClick={exportCharacterJson}>
                      <Download className="mr-2 h-4 w-4" /> Export JSON
                    </Button>

                    <Button variant="outline" onClick={() => jsonInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" /> Import JSON
                    </Button>

                    <Button variant="outline" onClick={() => pdfInputRef.current?.click()}>
                      <FileText className="mr-2 h-4 w-4" /> Parse PDF
                    </Button>

                    <Button variant="outline" onClick={() => imageInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" /> Import Image OCR
                    </Button>
                  </div>

                  {isImporting ? (
                    <div className="mt-3 border-2 border-stone-400 bg-white/60 p-3 text-sm font-black uppercase tracking-wide text-emerald-950">
                      Reading sheet... {ocrProgress > 0 ? `${ocrProgress}%` : ""}
                    </div>
                  ) : null}

                  {importReport ? (
                    <div className="mt-3 border-2 border-stone-400 bg-white/60 p-3 text-xs font-semibold text-stone-600">
                      <div className="font-serif text-sm font-black uppercase text-emerald-950">
                        {importReport.kind.toUpperCase()} import: {importReport.fileName}
                      </div>

                      {importReport.pagesRead ? <div>Pages read: {importReport.pagesRead}</div> : null}

                      <div className="mt-2">
                        <strong>Fields found:</strong>{" "}
                        {importReport.fieldsFound.length ? importReport.fieldsFound.join(", ") : "None"}
                      </div>

                      {importReport.warnings.length ? (
                        <div className="mt-2">
                          <strong>Warnings:</strong> {importReport.warnings.join(" ")}
                        </div>
                      ) : null}

                      {importReport.extractedText ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-black uppercase text-emerald-950">Extracted text preview</summary>
                          <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap border border-stone-300 bg-white p-2">
                            {importReport.extractedText}
                          </p>
                        </details>
                      ) : null}
                    </div>
                  ) : null}

                  <p className="mt-3 text-xs font-semibold leading-relaxed text-stone-500">
                    Image OCR creates an editable draft. Review imported fields before saving, especially handwritten sheets.
                  </p>
                </SheetCard>
              </div>

              <div className="space-y-6">
                <SheetCard>
                  <SectionTitle icon={Sparkles} title="Attributes" subtitle="Score, modifier, and quick check" />

                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    {abilityKeys.map((ability) => {
                      const score = character.abilities[ability];
                      const modifier = getModifier(score);

                      return (
                        <div key={ability} className="border-2 border-stone-600 bg-stone-50 p-3 text-center">
                          <div className="font-serif text-sm font-black uppercase tracking-wide text-emerald-950">
                            {abilityLabels[ability]}
                          </div>

                          <button
                            type="button"
                            onClick={() => rollAbilityCheck(ability)}
                            className="mx-auto my-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-stone-600 bg-white font-serif text-xl font-black shadow-sm"
                          >
                            {formatModifier(modifier)}
                          </button>

                          <div className="text-[10px] font-black uppercase tracking-wide text-stone-500">Score</div>

                          <NumberInput
                            value={score}
                            min={1}
                            max={30}
                            onChange={(value) => updateAbility(ability, value)}
                            className="text-center"
                          />
                        </div>
                      );
                    })}
                  </div>
                </SheetCard>

                <div className="grid gap-6">
                  <SheetCard>
                    <SectionTitle
                      icon={Shield}
                      title="Saving Throws"
                      subtitle={`${getProficiencyLabel(character.ruleset)} circles and rolls`}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {abilityKeys.map((ability) => {
                        const active = character.savingThrowProficiencies[ability];
                        const total = getModifier(character.abilities[ability]) + getSystemProficiencyBonus(character, active);

                        return (
                          <div key={ability} className="border border-stone-400 bg-white/60 p-2">
                            <label className="mb-2 flex items-center justify-between gap-2 text-sm font-black uppercase tracking-wide text-stone-700">
                              <span className="flex items-center gap-2">
                                <ProficiencyDot active={active} /> {abilityShortLabels[ability]} {formatModifier(total)}
                              </span>

                              <input
                                type="checkbox"
                                checked={active}
                                onChange={(event) => updateSaveProficiency(ability, event.target.checked)}
                              />
                            </label>

                            <Button onClick={() => rollSavingThrow(ability)} variant="outline" className="w-full">
                              Roll Save
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </SheetCard>

                  <SheetCard>
                    <SectionTitle
                      icon={ScrollText}
                      title="Skills"
                      subtitle={`Compact rows with ${getProficiencyLabel(character.ruleset).toLowerCase()} circles`}
                    />

                    <div className="grid gap-x-4 gap-y-2">
                      {skillKeys.map((skill) => {
                        const skillData = skillConfig[skill];
                        const active = character.skillProficiencies[skill];
                        const total =
                          getModifier(character.abilities[skillData.ability]) + getSystemProficiencyBonus(character, active);

                        return (
                          <div key={skill} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-stone-300 py-1">
                            <label className="flex items-center gap-2 text-sm font-black text-stone-800">
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={(event) => updateSkillProficiency(skill, event.target.checked)}
                                className="hidden"
                              />
                              <ProficiencyDot active={active} />
                              {skillData.label}
                            </label>

                            <span className="text-[10px] font-black uppercase tracking-wide text-stone-500">
                              {abilityShortLabels[skillData.ability]} {formatModifier(total)}
                            </span>

                            <Button onClick={() => rollSkill(skill)} variant="outline" className="h-7 px-2">
                              Roll
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </SheetCard>
                </div>
              </div>
            </div>
                        <div className="grid gap-6 lg:grid-cols-2">
              <SheetCard>
                <SectionTitle icon={Crosshair} title="Quick Rolls" subtitle="Common actions" />

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={rollInitiative}>Initiative</Button>
                  <Button onClick={() => rollSkill("perception")} variant="outline">
                    Perception
                  </Button>
                  <Button onClick={() => rollSkill("stealth")} variant="outline">
                    Stealth
                  </Button>
                  <Button onClick={() => rollSkill("athletics")} variant="outline">
                    Athletics
                  </Button>
                </div>

                <div className="mt-4 border-2 border-stone-500 bg-white/50 p-3">
                  <div className="mb-2 font-serif text-sm font-black uppercase tracking-wide text-emerald-950">
                    Manual Dice
                  </div>

                  <div className="flex gap-2">
                    <TextInput value={manualNotation} onChange={setManualNotation} placeholder="1d20, 2d6, 1d8+3" />
                    <Button onClick={rollManualDice}>Roll</Button>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-stone-500">
                    Supports 1d20, 2d6, 1d8+3, and 4d4-1.
                  </p>
                </div>
              </SheetCard>

              <SheetCard>
                <SectionTitle icon={History} title="Roll History" subtitle="Most recent 30 rolls" />

                {rollHistory.length === 0 ? (
                  <div className="border-2 border-dashed border-stone-300 bg-white/50 p-5 text-center text-sm font-semibold text-stone-500">
                    Your roll history will appear here.
                  </div>
                ) : (
                  <div className="max-h-96 space-y-2 overflow-auto">
                    {rollHistory.map((roll) => (
                      <button
                        key={roll.id}
                        type="button"
                        onClick={() => setActiveRoll(roll)}
                        className="w-full border-2 border-stone-400 bg-white/70 p-3 text-left transition hover:border-emerald-950 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-serif font-black uppercase text-emerald-950">{roll.title}</div>
                            <div className="text-xs font-semibold text-stone-500">
                              {new Date(roll.timestamp).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}{" "}
                              · {roll.diceNotation}
                            </div>
                          </div>

                          <div className="border-2 border-emerald-950 bg-emerald-950 px-3 py-1 font-serif text-lg font-black text-white">
                            {roll.total}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SheetCard>
            </div>
            <SheetCard>
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionTitle icon={Sword} title="Weapons & Damage" subtitle="Attack bonuses, damage dice, and traits" />

                <Button onClick={addWeapon} variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>

              <div className="space-y-3">
                {character.weapons.map((weapon) => (
                  <div key={weapon.id} className="border-2 border-stone-500 bg-white/60 p-3">
                    <div className="grid gap-3 lg:grid-cols-[1.2fr_.7fr_.7fr_auto] lg:items-end">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                        Weapon
                        <TextInput value={weapon.name} onChange={(name) => updateWeapon(weapon.id, { name })} />
                      </label>

                      <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                        Ability
                        <select
                          value={weapon.ability}
                          onChange={(event) => updateWeapon(weapon.id, { ability: event.target.value as AbilityKey })}
                          className="w-full border border-stone-400 bg-white px-2 py-1.5 text-sm font-semibold outline-none"
                        >
                          {abilityKeys.map((ability) => (
                            <option key={ability} value={ability}>
                              {abilityShortLabels[ability]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                        Damage
                        <TextInput value={weapon.damageDice} onChange={(damageDice) => updateWeapon(weapon.id, { damageDice })} />
                      </label>

                      <Button onClick={() => removeWeapon(weapon.id)} variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-4 text-sm font-semibold text-stone-600">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={weapon.proficient}
                            onChange={(event) => updateWeapon(weapon.id, { proficient: event.target.checked })}
                          />
                          {getProficiencyLabel(character.ruleset)}
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={weapon.damageBonusAbility}
                            onChange={(event) => updateWeapon(weapon.id, { damageBonusAbility: event.target.checked })}
                          />
                          Add ability to damage
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={() => rollWeaponAttack(weapon)}>Attack</Button>
                        <Button onClick={() => rollWeaponDamage(weapon)} variant="outline">
                          Damage
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SheetCard>

            <SheetCard>
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionTitle icon={Sparkles} title="Spellcasting" subtitle="Spell cards, save DC, and spell attack rolls" />

                <Button onClick={addSpell} variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <SheetField label="Spell Ability" value={abilityShortLabels[character.spellcastingAbility]} />
                <SheetField label="Spell Save DC" value={spellSaveDc} />
                <SheetField label="Spell Attack" value={formatModifier(spellAttackBonus)} />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {character.spells.map((spell) => (
                  <div key={spell.id} className="border-2 border-stone-500 bg-white/60 p-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_80px]">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                        Spell Name
                        <TextInput value={spell.name} onChange={(name) => updateSpell(spell.id, { name })} />
                      </label>

                      <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                        Rank
                        <NumberInput value={spell.rank} min={0} max={10} onChange={(rank) => updateSpell(spell.id, { rank })} />
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                        Tradition
                        <TextInput value={spell.tradition} onChange={(tradition) => updateSpell(spell.id, { tradition })} />
                      </label>

                      <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                        Casting Time
                        <TextInput value={spell.castingTime} onChange={(castingTime) => updateSpell(spell.id, { castingTime })} />
                      </label>

                      <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                        Range
                        <TextInput value={spell.range} onChange={(range) => updateSpell(spell.id, { range })} />
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px]">
                      <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                        Damage
                        <TextInput value={spell.damageDice} onChange={(damageDice) => updateSpell(spell.id, { damageDice })} />
                      </label>

                      <label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">
                        Save Ability
                        <select
                          value={spell.saveAbility}
                          onChange={(event) => updateSpell(spell.id, { saveAbility: event.target.value as AbilityKey })}
                          className="w-full border border-stone-400 bg-white px-2 py-1.5 text-sm font-semibold outline-none focus:border-emerald-950"
                        >
                          {abilityKeys.map((ability) => (
                            <option key={ability} value={ability}>
                              {abilityShortLabels[ability]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="mt-3 block text-[10px] font-black uppercase tracking-wide text-stone-500">
                      Notes
                      <TextInput value={spell.notes} onChange={(notes) => updateSpell(spell.id, { notes })} />
                    </label>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-4 text-sm font-semibold text-stone-600">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={spell.attackRoll}
                            onChange={(event) => updateSpell(spell.id, { attackRoll: event.target.checked })}
                          />
                          Attack roll
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={spell.savingThrow}
                            onChange={(event) => updateSpell(spell.id, { savingThrow: event.target.checked })}
                          />
                          Save DC {spellSaveDc} {abilityShortLabels[spell.saveAbility]}
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {spell.attackRoll ? <Button onClick={() => rollSpellAttack(spell)}>Attack</Button> : null}

                        {spell.damageDice ? (
                          <Button onClick={() => rollSpellDamage(spell)} variant="outline">
                            Damage
                          </Button>
                        ) : null}

                        <Button onClick={() => removeSpell(spell.id)} variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SheetCard>
          </section>

          <div className="hidden self-stretch bg-stone-900 xl:block" />

            <aside className="mt-6 space-y-6 border-t-4 border-stone-900 pt-6 xl:mt-0 xl:self-stretch xl:border-t-0 xl:pl-8 xl:pt-0">
            <SheetCard className="xl:sticky xl:top-6">
              <SectionTitle icon={Dices} title="Roll Center" subtitle="Roll, modifiers, and final total" />

              <div className="grid gap-4">
                <div className="flex min-h-[220px] flex-col items-center justify-center border-2 border-emerald-950 bg-emerald-950 p-5 text-center text-white">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Result</div>
                  <div className="max-w-full overflow-hidden text-ellipsis font-serif text-6xl font-black leading-none">
                    {activeRoll ? activeRoll.total : "--"}
                  </div>
                  <div className="mt-3 text-xs font-black uppercase tracking-wide text-white/60">Final total</div>
                </div>

                <div className="min-h-[220px] border-2 border-stone-500 bg-stone-50 p-4 sheet-lines">
                  <AnimatePresence mode="wait">
                    {activeRoll ? (
                      <motion.div
                        key={activeRoll.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <h3 className="mb-4 border-b-2 border-emerald-950 pb-2 font-serif text-xl font-black uppercase tracking-wide text-emerald-950">
                          {activeRoll.title}
                        </h3>

                        <div className="flex min-h-[150px] w-full flex-col items-center justify-center border-2 border-emerald-950 bg-emerald-950 p-4 text-white">
                          <motion.div
                            animate={
                              isRolling
                                ? { rotate: [0, 18, -18, 360], scale: [1, 1.08, 0.96, 1.05] }
                                : { rotate: 0, scale: 1 }
                            }
                            transition={{ duration: 0.35, repeat: isRolling ? Infinity : 0 }}
                            className="flex h-32 w-32 items-center justify-center border-4 border-white/30 bg-white/10 font-serif text-6xl font-black shadow-2xl backdrop-blur"
                          >
                            {isRolling ? previewDieNumber : activeRoll?.diceResults[0] ?? 20}
                          </motion.div>

                          <div className="mt-3 max-w-full text-center">
                            <div className="text-[10px] font-black uppercase tracking-wider text-white/60">Raw Roll</div>
                            <div className="truncate font-serif text-lg font-black">{activeRoll.diceNotation}</div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          {nonZeroModifierLines.length ? (
                            nonZeroModifierLines.map((line, index) => (
                              <div
                                key={`${line.label}-${index}`}
                                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden border border-stone-400 bg-white/70 px-3 py-2"
                              >
                                <span className="truncate text-xs font-black uppercase tracking-wide text-stone-600">
                                  {line.label}
                                </span>
                                <span className="shrink-0 rounded-sm border border-stone-300 bg-stone-50 px-3 py-1 text-right font-serif text-lg font-black leading-none text-stone-950">
                                  {formatModifier(line.value)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="border border-stone-400 bg-white/70 px-3 py-2 text-xs font-black uppercase tracking-wide text-stone-500">
                              No non-zero modifiers
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex min-h-[260px] flex-col items-center justify-center text-center"
                      >
                        <Dices className="mb-3 h-12 w-12 text-stone-300" />
                        <h3 className="font-serif text-xl font-black uppercase text-emerald-950">No rolls yet</h3>
                        <p className="mt-1 max-w-sm text-sm font-semibold text-stone-500">
                          Roll initiative, a skill check, a save, a weapon attack, or manual dice.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </SheetCard>
          </aside>
        </main>
      </div>
    </div>
  );
}