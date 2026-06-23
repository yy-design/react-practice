# Executive Desk Chat Redesign

## Goal

Redesign the existing web chat prototype into a polished AI workbench that feels simple, mature, and compelling in a demo. The feature scope stays focused on the current chat experience: conversation sidebar, message stream, streaming state, error state, and message input.

## Product Direction

The selected direction is **Executive Desk**: a restrained SaaS-style AI workspace with a dark navigation rail and a bright, highly readable work area. The redesign should feel more like a real product console than a decorative chat demo.

## Current Issues

- The current dark aurora background, glass panels, purple-blue gradients, glow effects, and large radii compete with the content.
- The UI reads as a generic AI-themed template instead of a professional tool.
- The chat area has limited hierarchy: messages, app identity, state, and input compete visually.

## Visual System

- Main canvas: warm off-white and white surfaces, using subtle borders instead of glow.
- Sidebar: deep ink tone to anchor the product identity.
- Accent: one restrained teal-blue accent for active states and the primary send action.
- Radius: mostly 8-12px, avoiding oversized pill-like shapes except where input ergonomics require it.
- Shadow: minimal and soft, used only to lift the command bar or important surfaces.
- Typography: system UI stack with clearer hierarchy, regular letter spacing, and practical product copy.

Suggested tokens:

- `--surface-page`: `#f5f7fa`
- `--surface-panel`: `#ffffff`
- `--surface-sidebar`: `#10141f`
- `--surface-sidebar-muted`: `#171c29`
- `--text-primary`: `#17202e`
- `--text-muted`: `#667085`
- `--border-subtle`: `#e4e8ef`
- `--accent`: `#2f7d8c`
- `--accent-strong`: `#236b79`
- `--danger-soft`: `#fff1f1`

## Layout

The app keeps the existing two-column shell:

- Left sidebar: brand, new chat action, conversation history, compact user area, and existing collapse control.
- Right workspace: a top header, message scroll area, and bottom command input.

The chat card should no longer look like a floating glass card. It becomes the main work surface inside the page, with stable margins and subtle boundaries.

## Components

### Sidebar

- Brand area uses a simple geometric mark and `Nexus AI` text.
- New chat button becomes a high-contrast professional action within the dark rail.
- History items use quiet hover states and a crisp active indicator.
- Collapsed sidebar keeps icon-only navigation readable and stable.
- User area remains at the bottom but uses realistic muted text and no decorative glow.

### Workspace Header

- Add a header above the messages with the current conversation title.
- Include compact status metadata such as `AI Workbench`, `Ready`, or `Streaming`.
- Keep the header useful and understated; it should orient the user without becoming a marketing hero.

### Messages

- Assistant messages should read like clean document blocks with strong markdown readability.
- User messages remain right-aligned and more compact, using the accent color sparingly.
- Error messages use a distinct soft-danger treatment rather than appearing as ordinary assistant replies.
- Streaming state keeps the existing behavior but uses a restrained caret and/or status chip.

### Input Command Bar

- Bottom input becomes the visual focal point: a white command bar with a clear border, focus state, and icon send button.
- Placeholder copy should be simple and action-oriented.
- The send/loading button must remain fixed-size so the layout does not jump.
- Disabled state should look intentional, not broken.

## Data Flow And Behavior

No backend or AI SDK behavior changes are required.

- Keep `useChat` usage in `ChatView`.
- Keep message persistence through `onMessagesChange`.
- Keep conversation creation and switching in `ChatPage`.
- Derive the active conversation title for the workspace header from the current conversation.

## Responsive Behavior

- Desktop is the primary demo target.
- At tablet/mobile widths, the sidebar remains collapsible and the chat workspace fills the viewport.
- Text and controls must not overlap or resize unexpectedly.

## Testing And Verification

- Run the production build.
- Run lint if the existing config supports it cleanly.
- Start the Vite dev server and visually inspect the page in a browser.
- Verify desktop and mobile viewport screenshots for layout, readable messages, and stable input controls.

## Out Of Scope

- Authentication.
- Backend changes.
- Persistent database storage.
- New conversation management features beyond the current create/switch/collapse behavior.
- A mobile-native app interface.
