# PilGi Image Manager — Project Rules & Guidelines

This document outlines the core architecture, coding standards, business logic, and operational rules for the **PilGi Image Manager** repository.

---

## 1. Project Overview & Architecture

- **Stack**: Vue 3 (Composition API with `<script setup lang="ts">`), TypeScript, Vite, Pinia, Vue Router.
- **Styling**: Vanilla CSS design system powered by CSS variables (`_ds/organic-edb397d8-99a9-4c87-a5c7-bca9b56d9bc8/styles.css`).
  - **Rule**: Do **NOT** introduce Tailwind CSS or heavy external component libraries. Use the existing semantic design tokens (`--color-bg`, `--color-surface`, `--color-accent`, `--color-accent-2`, `--color-neutral-*`, `--space-*`, `--radius-*`, etc.) and UI utility classes (`.btn`, `.input`, `.tag`, `.seg`, `.dialog-backdrop`, `.dialog`).
- **Icons**: SVG icon component (`src/components/Icon.vue`) using Lucide icon path definitions. When adding new icons, add the SVG path directly to the `PATHS` object in `Icon.vue`.

---

## 2. Data Persistence & GitHub Integration

- **Primary Source of Truth**: The configured GitHub repository (`auth.repo`, `auth.branch`, `auth.token`).
- **Persistence Layer**:
  - `src/services/github.ts` interacts directly with the GitHub REST API.
  - PilGi records are stored as individual JSON files in the repository under `records/rec_XXXX.json`.
  - App settings are stored in `settings.json` at the repo root and mirrored in `localStorage` under key `pilgi_settings`.
- **Soft Deletes**:
  - Records are never hard-deleted from the repository. Setting `deleted: true`, `deletedBy`, and `deletedAt` hides them from the UI while preserving git history.
- **Time Zone Handling**:
  - All timestamps are formatted according to the configured `timeZone` in `settings.current.timeZone` (defaults to `Asia/Jerusalem`). Use `fmt()` and `fmtPostDate()` from `src/domain.ts`.

---

## 3. Workflow & Business Rules

### 3.1 The 5 Workflow Stages
1. **Stage 1 (Text)**: Top Sentence and Bottom Sentence.
   - Text inputs must be multi-line `textarea` elements.
   - Line break edits on the **final approved version** are allowed in place without creating a new version.
2. **Stage 2 (Scenario)**: Scene description for image generation.
   - Replaces `#A` with Character A (e.g., `The Elephant`) and `#B` with Character B (e.g., `The Giraffe`).
3. **Stage 3 (Clean Image)**: Image generated without text overlay.
4. **Stage 4 (Image with Text)**: Final image with text/captions applied.
5. **Stage 5 (Posting)**: Scheduling and publishing to target platforms.

### 3.2 Tech Data Panel
- Slide-over drawer opened from Record Detail under the "Last modified" card.
- **Card 1 (Scenario)**:
  - Scenario preview with `#A` / `#B` replacement (preview only, unsaved).
  - Image prompt template preview with `@scenario` replacement (preview only, unsaved).
- **Card 2 (Text Generation)**:
  - Technical overrides: `Top Text Offset`, `Bottom Text Offset`, and `Font Size` (persisted to record).
  - Prompts: `Top Image prompt` and `Bottom Image prompt` previews (unsaved).
  - Dynamic token replacements:
    - `@Record`: Record number padded to 3 digits if `< 1000` (e.g., `005`).
    - `@TopText`: Final approved top sentence (`shown1(stage1).topSentence`), with each line trimmed and newlines replaced with `|`.
    - `@BottomText`: Final approved bottom sentence (`shown1(stage1).bottomSentence`), with each line trimmed and newlines replaced with `|`.
    - `@FontSize`: Record `fontSize` override if present, otherwise `defaultFontSize` from settings.
    - `@TextCenter`: `centerAlign` from settings (default `768`).
    - `@TopLocation`: Settings `topTextLocation` (default `700`) + record `topTextOffset`.
    - `@BottomLocation`: Settings `bottomTextLocation` + record `bottomTextOffset`.
  - Copy actions: Individual copy-to-clipboard buttons beside each prompt, and a combined button below both prompts.

### 3.3 Google Drive Asset Downloads
- Wherever an **"Open in Drive"** link/button is displayed, a corresponding **"Download"** button must be present.
- Download links must use the direct download URL structure:
  `https://drive.google.com/uc?export=download&id=[ID]`
- Drive IDs must be parsed using `extractGoogleDriveId` from `src/domain.ts`.

### 3.4 Table Sorting
- In the Dashboard records table, clicking any column header toggles sort order (ascending / descending).
- Clicking the **`PilGi`** header sorts numerically by record number (`num`).

---

## 4. Versioning & Changelog Protocol

- **Build Version**: Formatted build timestamp generated in `vite.config.ts` via `__APP_BUILD_DATE__`.
- **Changelog Record**:
  - `src/data/versions.json` maintains the chronological release history.
  - **MANDATORY RULE**: After every feature, bugfix, or enhancement, record the changes in `src/data/versions.json` with version number, timestamp, title, and bulleted change items.
  - The version badge in Settings is clickable and opens the `VersionHistoryModal.vue` dialog displaying this history.

---

## 5. Development & Code Quality Standards

1. **Type Safety**: Strictly adhere to TypeScript types. No untyped `any` without explicit justification.
2. **Build Validation**: Always verify changes before completion by running `npm run build` (`vue-tsc --noEmit && vite build`). The build must exit with code 0.
3. **No Placeholders**: Never introduce dummy placeholder images or unfinished stubs in production paths.
4. **Documentation Integrity**: Preserve existing comments and docstrings.
