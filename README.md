# Tabletop Character Sheet Helper

A React app for managing tabletop RPG character sheets, rolling dice, and importing character data from PDFs or images.

The app currently supports D&D-style and Pathfinder-style character data, including abilities, skills, saves, weapons, spells, hit points, armor class, and dice roll breakdowns.

## Current Features

- Character sheet interface
- D&D 2024 / 5e-style support
- Pathfinder 2e Remaster-style support
- Dice rolling with modifier breakdowns
- Skills, saving throws, weapons, and spells
- JSON import/export
- PDF text extraction
- Image OCR import
- Human-in-the-loop import review
- Named import agents
- Character sheet ontology
- Ontology-based validation and confidence scoring

## Semantic Import Pipeline

The import system is being refactored into a semantic agent pipeline.

Current agents include:

- Text Normalization Agent
- Template Noise Agent
- Ruleset Detection Agent
- Identity Extraction Agent
- Core Numbers Agent
- Ability Score Agent
- Spellcasting Ability Agent
- Skill Detection Agent
- Saving Throw Detection Agent
- Weapon Detection Agent
- Ontology Validation Agent
- Character Patch Composer Agent

These are currently TypeScript agents, not LLM agents. They run in sequence, share context, produce candidate fields, assign confidence, and send uncertain values to a human review step.

## Why This Project Exists

This project is a practical learning sandbox for:

- Semantic data layers
- Ontology design
- Agent orchestration
- Human-in-the-loop workflows
- Document parsing
- AI-assisted structured data extraction

The goal is to turn messy character sheet documents into structured character data that a user can review and trust.
