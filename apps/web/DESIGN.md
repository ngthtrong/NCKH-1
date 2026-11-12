---
name: TenantFlow
description: Readable Vietnamese workspaces with useful width and responsive organization and project views.
colors:
  primary: "#246bfd"
  primary-dark: "#1748b5"
  primary-light: "#e8efff"
  secondary: "#0f9f8f"
  canvas: "#f6f7f9"
  paper: "#ffffff"
  ink: "#172033"
  muted: "#637083"
  border: "#e3e8f0"
  success: "#16856b"
  warning: "#c27a0a"
  error: "#c94343"
typography:
  headline:
    fontFamily: '"Be Vietnam Pro", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.03em"
  title:
    fontSize: "1rem"
    fontWeight: 600
  body:
    fontSize: "0.9rem"
    lineHeight: 1.65
  supporting:
    fontSize: "0.8rem"
    lineHeight: 1.65
  button:
    fontWeight: 650
rounded:
  control: "8px"
  navigation: "10px"
  surface: "12px"
spacing:
  compact: "8px"
  related: "12px"
  group: "16px"
  panel: "22px"
  generous: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.surface}"
    padding: "22px"
---

# Design System: TenantFlow

## Overview

**Creative North Star: "The Working Workspace"**

This records the incumbent blue and white MUI application, scoped to the organization chooser, project list, project overview, and application shell. It is a source-derived record of a narrow refinement, not a new product identity. Readable Vietnamese text, clear status, and usable content width guide the interface.

Organization identity leads to projects; project identity and progress lead to boards. White bordered surfaces organize real names, counts, roles, and actions without requiring decorative imagery.

**Key Characteristics:**

- Locally served Vietnamese typography.
- Blue actions, restrained borders, white working surfaces.
- Fluid content with a compact supporting column.
- Explicit status labels and responsive rows.

## Colors

The primary blue marks actionable and selected elements; neutral surfaces carry the information.

### Primary

- **Action blue:** primary buttons, selected navigation, and links; the dark variant supplies the contained-button hover treatment.
- **Pale blue:** tenant and project identity markers.

### Secondary

- **Teal:** the incumbent theme's secondary accent; it does not replace blue as the main action color.
- **Success, warning, error:** semantic MUI states paired with text labels, including outlined status chips.

### Neutral

- **Canvas and paper:** the theme's application backdrop and working surfaces.
- **Ink and muted:** primary and supporting text.
- **Border:** recurring panel separation.

**The Labeled Status Rule.** Status must remain readable as text alongside its semantic color.

## Typography

**Body and heading font:** Be Vietnam Pro with the fallback stack recorded above. Local font files provide normal weights 400, 500, 600, and 700; font synthesis is disabled.

The hierarchy favors compact working headings and generous body line height for Vietnamese. Page headings use the headline role; section headings use title; supporting descriptions use the smaller body role. The intermediate MUI h5 is (1.3rem, 600). Buttons retain natural case.

**The Vietnamese Reading Rule.** Preserve local font loading and the observed body line height when extending these workspaces.

## Layout

The desktop shell reserves a fixed drawer (232px) from the MUI md breakpoint (900px); below it, navigation becomes temporary. The toolbar and content offset are (64px). Main content is centered within available workspace width, capped at (1480px), with total horizontal inset (72px). The wide and narrow variants cap at (1440px) and (900px), with total inset (48px). At (760px) and below, all use total inset (28px).

The organization chooser caps at (1120px). Desktop organization rows align avatar, identity, membership, status, and open action. At (1000px) they regroup into three columns; at (600px) they stack around identity and give the open action a full row.

Project overview uses a flexible main column and a supporting column (320px), separated by (16px); it becomes one column at (1020px). Project tables become labeled two-column cards at (760px), keeping title and actions full width. Filters stack at this breakpoint. Panel padding changes from (22px) to (14px); the projects panel has its own (24px)/(16px) padding.

**The Useful Width Rule.** Let the primary project column grow with the available shell width, and collapse the supporting column before it compresses the work.

## Elevation & Depth

The sampled workspace surfaces use outlined white papers and subtle neutral layering. Buttons disable elevation. Hover on organization and board rows changes border or surface color rather than lifting the row. Preserve MUI's existing overlay behavior for dialogs and temporary drawers.

## Shapes

Theme surfaces use gently rounded corners; buttons use the smaller control radius and navigation uses the intermediate radius. Identity avatars remain compact rounded squares. Borders are thin and pale; they separate working groups without creating heavy frames.

## Components

### Buttons

Contained blue buttons identify the main available action. Buttons have a minimum height (40px), horizontal padding (16px), and natural-case labels. Secondary actions use text or outlined MUI variants. The global keyboard focus treatment is an outline (2px solid #245db6) offset by (3px).

### Chips

Status chips are small, outlined, and labeled in Vietnamese. Their color follows status semantics. Role chips are outlined without competing with the main action.

### Cards / Containers

Outlined white papers hold projects and related groups. Use the panel padding and responsive behavior above. Organization rows align comparison fields on desktop and keep the open action reachable on mobile.

### Inputs / Fields

Text fields default to MUI small size. Keep visible labels, the incumbent outlined treatment, and MUI focus/error/disabled states. Forms use stacked spacing rather than decorative containers inside every field group.

### Navigation

Selected links have pale blue fill and blue text. Navigation rows have minimum height (44px), padding (9px 12px), and rounded corners. Preserve the fixed desktop drawer and temporary mobile drawer behavior.

### Board links and progress

Board links fill the main column, use a minimum height (68px), and pair a numbered identity tile with a board name and arrow. Hover changes border and background. Progress accompanies completed/total counts; project overview also displays a percentage. Counts and widths are calculated from project data.

## Do's and Don'ts

### Do:

- **Do** retain readable Vietnamese labels, local fonts, and natural-case actions.
- **Do** show identity, status, and an open action together in organization rows.
- **Do** keep project progress and board access prominent in project overview.
- **Do** preserve responsive stacking and flexible project width.

### Don't:

- **Don't** use color as the only status signal.
- **Don't** copy pre-existing uppercase eyebrows into new workspace headers.
- **Don't** treat legacy decorative gradients as required workspace styling.

The existing stylesheet carries uppercase eyebrows/navigation labels, decorative chooser/onboarding gradients, and weights above the locally supplied font range. These are recorded as incumbent drift, not new system rules or repairs. The body CSS backdrop also differs from the theme canvas; the theme remains the token source above. Source evidence: src/theme.ts, src/styles.css, src/layouts/AppShell.tsx, src/pages/TenantSelectionPage.tsx, src/pages/ProjectsPage.tsx, src/pages/ProjectWorkspacePage.tsx, and src/components/StatusChip.tsx. Browser rendering was not independently inspected for this documentation pass.
