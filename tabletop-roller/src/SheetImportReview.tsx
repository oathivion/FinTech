import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, ListChecks, Network, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CharacterPatch, ParsedSheetRow, ParsedSheetSection, SheetParseResult } from "./sheetParser";
import { rowsBySection } from "./sheetParser";

type SheetImportReviewProps = {
  result: SheetParseResult | null;
  onApply: (patch: CharacterPatch) => void;
  onCancel: () => void;
};

type DetailPanel = "none" | "raw" | "agents" | "semantic";

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

function splitDetailSections(normalizedText: string) {
  const agentLogStart = normalizedText.indexOf("Agent Log:");
  const semanticLayerStart = normalizedText.indexOf("Semantic Layer:");

  const rawText =
    agentLogStart >= 0
      ? normalizedText.slice(0, agentLogStart).trim()
      : semanticLayerStart >= 0
        ? normalizedText.slice(0, semanticLayerStart).trim()
        : normalizedText.trim();

  const agentLog =
    agentLogStart >= 0
      ? normalizedText
          .slice(agentLogStart, semanticLayerStart >= 0 ? semanticLayerStart : undefined)
          .trim()
      : "No agent log was included in this import result.";

  const semanticLayer =
    semanticLayerStart >= 0
      ? normalizedText.slice(semanticLayerStart).trim()
      : "No semantic layer notes were included in this import result.";

  return {
    rawText,
    agentLog,
    semanticLayer,
  };
}

function panelButtonClass(active: boolean) {
  return active
    ? "border-emerald-950 bg-emerald-950 text-white"
    : "border-stone-500 bg-white text-stone-900 hover:bg-stone-100";
}

export default function SheetImportReview({ result, onApply, onCancel }: SheetImportReviewProps) {
  const [detailPanel, setDetailPanel] = useState<DetailPanel>("none");
  const [disabledRows, setDisabledRows] = useState<Record<string, boolean>>({});

  const groupedRows = useMemo(() => (result ? rowsBySection(result.rows) : null), [result]);

  const detailSections = useMemo(
    () =>
      result
        ? splitDetailSections(result.normalizedText)
        : {
            rawText: "",
            agentLog: "",
            semanticLayer: "",
          },
    [result],
  );

  if (!result || !groupedRows) return null;

  const selectedRows = result.rows.filter((row) => !disabledRows[row.id]);
  const selectedPatch = buildPatchFromSelectedRows(selectedRows, result.patch);
  const selectedCount = selectedRows.length;

  const highConfidenceCount = selectedRows.filter((row) => row.confidence >= 0.8).length;
  const mediumConfidenceCount = selectedRows.filter((row) => row.confidence >= 0.6 && row.confidence < 0.8).length;
  const lowConfidenceCount = selectedRows.filter((row) => row.confidence < 0.6).length;

  function toggleRow(rowId: string) {
    setDisabledRows((current) => ({ ...current, [rowId]: !current[rowId] }));
  }

  function togglePanel(panel: DetailPanel) {
    setDetailPanel((current) => (current === panel ? "none" : panel));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-stone-950/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl border-2 border-stone-700 bg-stone-50 shadow-2xl">
        <div className="border-b-2 border-stone-700 bg-emerald-950 p-4 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-black uppercase tracking-wide">Review Sheet Import</h2>
              <p className="mt-1 text-sm font-semibold text-white/70">
                Confirm the agent-detected rows before applying them to the character sheet.
              </p>
            </div>

            <div className="grid gap-2 text-right sm:grid-cols-2">
              <div className="border border-white/30 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">Detected Ruleset</div>
                <div className="font-serif text-lg font-black">{result.ruleset}</div>
              </div>

              <div className="border border-white/30 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">Pipeline</div>
                <div className="font-serif text-lg font-black">Agent Review</div>
              </div>
            </div>
          </div>
        </div>

        {result.warnings.length ? (
          <div className="border-b-2 border-amber-700 bg-amber-100 p-3 text-sm font-bold text-amber-950">
            {result.warnings.join(" ")}
          </div>
        ) : null}

        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
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
                        <div
                          key={row.id}
                          className={`grid gap-2 px-3 py-2 sm:grid-cols-[32px_1fr_1fr_96px] sm:items-center ${
                            disabled ? "opacity-45" : ""
                          }`}
                        >
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

                          <div
                            className={`border px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide ${confidenceClass(
                              row.confidence,
                            )}`}
                          >
                            {confidenceLabel(row.confidence)}
                          </div>

                          <div className="sm:col-span-4">
                            <div className="text-xs font-semibold text-stone-500">
                              <span className="font-black uppercase tracking-wide text-stone-600">Source:</span>{" "}
                              {row.sourceText}
                            </div>
                            {row.notes ? <div className="mt-1 text-xs font-semibold text-stone-500">{row.notes}</div> : null}
                          </div>
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

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="border border-emerald-800 bg-emerald-950 p-2 text-white">
                  <div className="text-[10px] font-black uppercase tracking-wide text-white/70">High</div>
                  <div className="font-serif text-xl font-black">{highConfidenceCount}</div>
                </div>

                <div className="border border-stone-500 bg-stone-100 p-2 text-stone-900">
                  <div className="text-[10px] font-black uppercase tracking-wide text-stone-500">Medium</div>
                  <div className="font-serif text-xl font-black">{mediumConfidenceCount}</div>
                </div>

                <div className="border border-amber-700 bg-amber-100 p-2 text-amber-950">
                  <div className="text-[10px] font-black uppercase tracking-wide text-amber-700">Low</div>
                  <div className="font-serif text-xl font-black">{lowConfidenceCount}</div>
                </div>
              </div>

              <p className="mt-3 text-xs font-semibold leading-relaxed text-stone-500">
                Uncheck any row that looks wrong. Low-confidence rows are shown for review, but they may not apply to the final
                character patch.
              </p>
            </div>

            <div className="border-2 border-stone-600 bg-white/70 p-3">
              <div className="font-serif text-lg font-black uppercase text-emerald-950">Pipeline Details</div>

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => togglePanel("agents")}
                  className={`flex items-center justify-center border px-3 py-2 text-sm font-black uppercase tracking-wide ${panelButtonClass(
                    detailPanel === "agents",
                  )}`}
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  Agent Trace
                </button>

                <button
                  type="button"
                  onClick={() => togglePanel("semantic")}
                  className={`flex items-center justify-center border px-3 py-2 text-sm font-black uppercase tracking-wide ${panelButtonClass(
                    detailPanel === "semantic",
                  )}`}
                >
                  <Network className="mr-2 h-4 w-4" />
                  Semantic Layer
                </button>

                <button
                  type="button"
                  onClick={() => togglePanel("raw")}
                  className={`flex items-center justify-center border px-3 py-2 text-sm font-black uppercase tracking-wide ${panelButtonClass(
                    detailPanel === "raw",
                  )}`}
                >
                  {detailPanel === "raw" ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  Raw Text
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Button onClick={() => onApply(selectedPatch)}>
                <Check className="mr-2 h-4 w-4" /> Apply Import
              </Button>

              <Button variant="outline" onClick={onCancel}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>

            {detailPanel !== "none" ? (
              <div className="max-h-[32rem] overflow-auto border-2 border-stone-600 bg-white p-3 text-xs font-semibold leading-relaxed text-stone-700 whitespace-pre-wrap">
                {detailPanel === "raw" ? detailSections.rawText : null}
                {detailPanel === "agents" ? detailSections.agentLog : null}
                {detailPanel === "semantic" ? detailSections.semanticLayer : null}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function buildPatchFromSelectedRows(rows: ParsedSheetRow[], originalPatch: CharacterPatch): CharacterPatch {
  const patch: CharacterPatch = {};

  function asNumber(value: ParsedSheetRow["value"]) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
  }

  function asText(value: ParsedSheetRow["value"]) {
    return String(value).trim();
  }

  function asSpellcastingAbility(value: ParsedSheetRow["value"]): CharacterPatch["spellcastingAbility"] | undefined {
    const normalized = String(value).trim().toLowerCase();

    if (["strength", "str"].includes(normalized)) return "strength";
    if (["dexterity", "dex"].includes(normalized)) return "dexterity";
    if (["constitution", "con"].includes(normalized)) return "constitution";
    if (["intelligence", "int"].includes(normalized)) return "intelligence";
    if (["wisdom", "wis"].includes(normalized)) return "wisdom";
    if (["charisma", "cha"].includes(normalized)) return "charisma";

    return undefined;
  }

  function asRuleset(value: ParsedSheetRow["value"]): CharacterPatch["ruleset"] {
    const normalized = String(value).trim().toLowerCase();

    if (normalized.includes("pathfinder") || normalized.includes("pf2")) {
      return "pf2eRemaster";
    }

    return "dnd5e2024";
  }

  for (const row of rows) {
    switch (row.label) {
      case "Ruleset":
        patch.ruleset = originalPatch.ruleset ?? asRuleset(row.value);
        break;

      case "Character Name":
        patch.name = originalPatch.name ?? asText(row.value);
        break;

      case "Class":
        patch.className = originalPatch.className ?? asText(row.value);
        break;

      case "Background":
        patch.background = originalPatch.background ?? asText(row.value);
        break;

      case "Species":
      case "Ancestry":
        patch.species = originalPatch.species ?? asText(row.value);
        break;

      case "Level": {
        const value = originalPatch.level ?? asNumber(row.value);
        if (value !== undefined) patch.level = value;
        break;
      }

      case "Armor Class": {
        const value = originalPatch.armorClass ?? asNumber(row.value);
        if (value !== undefined) patch.armorClass = value;
        break;
      }

      case "Speed": {
        const value = originalPatch.speed ?? asNumber(row.value);
        if (value !== undefined) patch.speed = value;
        break;
      }

      case "Maximum HP": {
        const value = originalPatch.maxHp ?? asNumber(row.value);
        if (value !== undefined) {
          patch.maxHp = value;
          patch.currentHp = originalPatch.currentHp ?? patch.currentHp ?? value;
        }
        break;
      }

      case "Current HP": {
        const value = originalPatch.currentHp ?? asNumber(row.value);
        if (value !== undefined) patch.currentHp = value;
        break;
      }

      case "Proficiency Bonus": {
        const value = originalPatch.proficiencyBonus ?? asNumber(row.value);
        if (value !== undefined) patch.proficiencyBonus = value;
        break;
      }

      case "Spellcasting Ability": {
        const value = originalPatch.spellcastingAbility ?? asSpellcastingAbility(row.value);
        if (value) patch.spellcastingAbility = value;
        break;
      }

      case "Strength": {
        const value = originalPatch.abilities?.strength ?? asNumber(row.value);
        if (value !== undefined) {
          patch.abilities = { ...patch.abilities, strength: value };
        }
        break;
      }

      case "Dexterity": {
        const value = originalPatch.abilities?.dexterity ?? asNumber(row.value);
        if (value !== undefined) {
          patch.abilities = { ...patch.abilities, dexterity: value };
        }
        break;
      }

      case "Constitution": {
        const value = originalPatch.abilities?.constitution ?? asNumber(row.value);
        if (value !== undefined) {
          patch.abilities = { ...patch.abilities, constitution: value };
        }
        break;
      }

      case "Intelligence": {
        const value = originalPatch.abilities?.intelligence ?? asNumber(row.value);
        if (value !== undefined) {
          patch.abilities = { ...patch.abilities, intelligence: value };
        }
        break;
      }

      case "Wisdom": {
        const value = originalPatch.abilities?.wisdom ?? asNumber(row.value);
        if (value !== undefined) {
          patch.abilities = { ...patch.abilities, wisdom: value };
        }
        break;
      }

      case "Charisma": {
        const value = originalPatch.abilities?.charisma ?? asNumber(row.value);
        if (value !== undefined) {
          patch.abilities = { ...patch.abilities, charisma: value };
        }
        break;
      }

      default:
        break;
    }
  }

  return patch;
}