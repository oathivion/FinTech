import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CharacterPatch, ParsedSheetRow, ParsedSheetSection, SheetParseResult } from "./sheetParser";
import { rowsBySection } from "./sheetParser";

type SheetImportReviewProps = {
  result: SheetParseResult | null;
  onApply: (patch: CharacterPatch) => void;
  onCancel: () => void;
};

const sectionLabels: Record<ParsedSheetSection, string> = {
  ruleset: "Ruleset",
  identity: "Identity",
  defense: "Defense",
  hitPoints: "Hit Points",
  movement: "Movement",
  abilities: "Abilities",
  proficiency: "Proficiency",
  spellcasting: "Spellcasting",
  weapons: "Weapons",
  skills: "Skills",
  saves: "Saves",
  raw: "Review Needed",
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

function confidenceLabel(confidence: number) {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.6) return "Medium";
  return "Low";
}

function confidenceClass(confidence: number) {
  if (confidence >= 0.8) return "border-emerald-800 bg-emerald-950 text-white";
  if (confidence >= 0.6) return "border-stone-500 bg-stone-100 text-stone-900";
  return "border-amber-700 bg-amber-100 text-amber-950";
}

function rowValue(row: ParsedSheetRow) {
  if (typeof row.value === "boolean") return row.value ? "Yes" : "No";
  return String(row.value);
}

export default function SheetImportReview({ result, onApply, onCancel }: SheetImportReviewProps) {
  const [showRawText, setShowRawText] = useState(false);
  const [disabledRows, setDisabledRows] = useState<Record<string, boolean>>({});

  const groupedRows = useMemo(() => (result ? rowsBySection(result.rows) : null), [result]);

  if (!result || !groupedRows) return null;

  const selectedRows = result.rows.filter((row) => !disabledRows[row.id]);
  const selectedPatch = buildPatchFromSelectedRows(selectedRows, result.patch);
  const selectedCount = selectedRows.length;

  function toggleRow(rowId: string) {
    setDisabledRows((current) => ({ ...current, [rowId]: !current[rowId] }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-stone-950/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl border-2 border-stone-700 bg-stone-50 shadow-2xl">
        <div className="border-b-2 border-stone-700 bg-emerald-950 p-4 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-black uppercase tracking-wide">Review Sheet Import</h2>
              <p className="mt-1 text-sm font-semibold text-white/70">
                Confirm the rows before applying them to the character sheet.
              </p>
            </div>
            <div className="border border-white/30 px-3 py-2 text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">Detected Ruleset</div>
              <div className="font-serif text-lg font-black">{result.ruleset}</div>
            </div>
          </div>
        </div>

        {result.warnings.length ? (
          <div className="border-b-2 border-amber-700 bg-amber-100 p-3 text-sm font-bold text-amber-950">
            {result.warnings.join(" ")}
          </div>
        ) : null}

        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {sectionOrder.map((section) => {
              const rows = groupedRows[section];
              if (!rows.length) return null;

              return (
                <div key={section} className="border-2 border-stone-600 bg-white/70">
                  <div className="border-b border-stone-400 bg-stone-100 px-3 py-2 font-serif font-black uppercase tracking-wide text-emerald-950">
                    {sectionLabels[section]}
                  </div>
                  <div className="divide-y divide-stone-300">
                    {rows.map((row) => {
                      const disabled = Boolean(disabledRows[row.id]);
                      return (
                        <div key={row.id} className={`grid gap-2 px-3 py-2 sm:grid-cols-[32px_1fr_1fr_96px] sm:items-center ${disabled ? "opacity-45" : ""}`}>
                          <button
                            type="button"
                            onClick={() => toggleRow(row.id)}
                            className="flex h-7 w-7 items-center justify-center border border-stone-500 bg-white text-stone-900"
                            aria-label={disabled ? "Include row" : "Exclude row"}
                          >
                            {disabled ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </button>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-black uppercase tracking-wide text-stone-500">Label</div>
                            <div className="truncate font-serif text-lg font-black text-stone-950">{row.label}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-black uppercase tracking-wide text-stone-500">Value</div>
                            <div className="truncate font-bold text-stone-900">{rowValue(row)}</div>
                          </div>
                          <div className={`border px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide ${confidenceClass(row.confidence)}`}>
                            {confidenceLabel(row.confidence)}
                          </div>
                          {row.notes ? <div className="sm:col-span-4 text-xs font-semibold text-stone-500">{row.notes}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="space-y-3">
            <div className="border-2 border-stone-600 bg-white/70 p-3">
              <div className="font-serif text-lg font-black uppercase text-emerald-950">Import Summary</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="border border-stone-400 bg-stone-50 p-2">
                  <div className="text-[10px] font-black uppercase tracking-wide text-stone-500">Rows</div>
                  <div className="font-serif text-2xl font-black">{selectedCount}</div>
                </div>
                <div className="border border-stone-400 bg-stone-50 p-2">
                  <div className="text-[10px] font-black uppercase tracking-wide text-stone-500">Warnings</div>
                  <div className="font-serif text-2xl font-black">{result.warnings.length}</div>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold leading-relaxed text-stone-500">
                Uncheck any row that looks wrong. Low-confidence rows are included for review, but they may not apply to the final character patch.
              </p>
            </div>

            <div className="grid gap-2">
              <Button onClick={() => onApply(selectedPatch)}>
                <Check className="mr-2 h-4 w-4" /> Apply Import
              </Button>
              <Button variant="outline" onClick={() => setShowRawText((current) => !current)}>
                {showRawText ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {showRawText ? "Hide Text" : "Show Text"}
              </Button>
              <Button variant="outline" onClick={onCancel}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>

            {showRawText ? (
              <div className="max-h-96 overflow-auto border-2 border-stone-600 bg-white p-3 text-xs font-semibold leading-relaxed text-stone-700 whitespace-pre-wrap">
                {result.normalizedText}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function buildPatchFromSelectedRows(rows: ParsedSheetRow[], originalPatch: CharacterPatch): CharacterPatch {
  const selectedLabels = new Set(rows.map((row) => row.label));
  const patch: CharacterPatch = {};

  if (selectedLabels.has("Ruleset") && originalPatch.ruleset) patch.ruleset = originalPatch.ruleset;
  if (selectedLabels.has("Character Name") && originalPatch.name) patch.name = originalPatch.name;
  if (selectedLabels.has("Class") && originalPatch.className) patch.className = originalPatch.className;
  if (selectedLabels.has("Background") && originalPatch.background) patch.background = originalPatch.background;
  if (selectedLabels.has("Species") && originalPatch.species) patch.species = originalPatch.species;
  if (selectedLabels.has("Level") && originalPatch.level !== undefined) patch.level = originalPatch.level;
  if (selectedLabels.has("Armor Class") && originalPatch.armorClass !== undefined) patch.armorClass = originalPatch.armorClass;
  if (selectedLabels.has("Speed") && originalPatch.speed !== undefined) patch.speed = originalPatch.speed;
  if (selectedLabels.has("Maximum HP") && originalPatch.maxHp !== undefined) {
    patch.maxHp = originalPatch.maxHp;
    patch.currentHp = originalPatch.currentHp ?? originalPatch.maxHp;
  }
  if (selectedLabels.has("Proficiency Bonus") && originalPatch.proficiencyBonus !== undefined) patch.proficiencyBonus = originalPatch.proficiencyBonus;

  const abilityLabels = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
  for (const label of abilityLabels) {
    if (!selectedLabels.has(label)) continue;
    const abilityKey = label.toLowerCase() as keyof NonNullable<CharacterPatch["abilities"]>;
    const abilityValue = originalPatch.abilities?.[abilityKey];
    if (abilityValue !== undefined) patch.abilities = { ...patch.abilities, [abilityKey]: abilityValue };
  }

  return patch;
}
