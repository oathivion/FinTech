## Case Study: Turning Character Sheets into Structured Data

This project started as a tabletop dice roller and character sheet helper, but it has grown into a practical experiment in document understanding and structured data workflows.

The core problem is simple:

> Can messy tabletop character sheet data from PDFs, screenshots, and images be turned into structured, reviewable character data that a user can trust?

### What the App Does

The app lets a user manage a tabletop RPG character sheet, roll dice, track roll history, import and export character data, and review imported fields before applying them to the character.

Current features include:

- Character sheet layout
- Ability checks, saving throws, skill checks, weapon rolls, spell rolls, and manual dice rolls
- Sticky Roll Center that stays visible while scrolling
- Roll history
- JSON import/export
- PDF text extraction
- Image OCR import
- Human-in-the-loop import review

### Why This Matters

Character sheets are semi-structured documents. They contain important data, but the layout can vary across systems, PDFs, screenshots, scans, and handwritten sheets.

This makes them a useful sandbox for learning how to work with messy real-world documents.

The project connects several concepts:

- Frontend application development
- TypeScript data modeling
- OCR cleanup
- PDF text extraction
- Structured JSON output
- Human review workflows
- Semantic data layers
- Agent-style parsing pipelines

### Technical Approach

The import workflow is designed as a staged pipeline:

1. Extract text from a PDF or image
2. Normalize the text
3. Detect likely character fields
4. Create a structured character update
5. Present uncertain fields to the user for review
6. Apply approved data to the character sheet

The current parsing system is written in TypeScript. It is not a full AI agent yet, but it is structured like an agent workflow: each stage has a specific job, shares context, and produces data for the next step.

### What I Learned

This project helped me practice:

- Building a React and TypeScript app from scratch
- Designing reusable UI sections
- Managing application state
- Modeling character data with typed objects
- Parsing imported document text
- Creating a review step before applying automated changes
- Deploying a project publicly with Vercel
- Writing about technical progress in public

### Next Improvements

Planned improvements include:

- Adding screenshots and a short demo video
- Improving the import review experience
- Adding a real AI-assisted parsing step
- Creating a clearer semantic model for character sheet fields
- Improving support for different RPG systems
- Adding better validation and confidence scoring
