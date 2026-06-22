# Game UI Loading & Layout Optimization Documentation

## 1. Loading State Management (UI Flowchart)

This document outlines the state transitions for the game's loading process, ensuring a smooth user experience without "perceived crashes" or blank screens.

```mermaid
graph TD
    A[Start Application] --> B[Show Full-Screen Loading Overlay]
    B --> C{Load Resources}
    C -->|Parallel| D[Fetch Questions (JSON)]
    C -->|Parallel| E[Load 3D Assets (GLB)]
    D --> F[Wait for All Promises]
    E --> F
    F --> G{All Resources Ready?}
    G -->|No| H[Show Error Message / Retry]
    G -->|Yes| I[Initialize Game Scene]
    I --> J[Fade Out Loading Overlay (0.5s)]
    J --> K[Start Game Loop & HUD]
```

### Key Components:
1.  **Loading Overlay (`#loading-overlay`)**:
    -   **Initial State**: Visible (`opacity: 1`, `z-index: 9999`).
    -   **Content**: Spinner and status text.
    -   **Transition**: CSS `transition: opacity 0.5s ease-out`.
    -   **Final State**: Hidden (`opacity: 0`, `pointer-events: none`, then `display: none`).

2.  **Resource Synchronization (`Promise.all`)**:
    -   Ensures the game does not start until *both* the game logic data (questions) and visual assets (boat model) are fully ready.
    -   Prevents the "pop-in" effect of 3D models appearing late.

---

## 2. Fixed-Width Digit Layout Mechanism

To prevent layout shifts and "jittering" when numbers change (e.g., speed changing from "1.1" to "10.0"), we implemented a fixed-width digit rendering system.

### Architecture:

-   **Container (`.digit-row`)**: Flex container that holds individual digit boxes.
-   **Digit Box (`.digit-box`)**:
    -   Fixed width (`0.65em`).
    -   Centered text (`text-align: center`).
    -   `tabular-nums` font feature enabled.
-   **Separator (`.digit-separator`)**:
    -   Fixed width (`0.35em`) for decimals `.` or colons `:`.
-   **Helper Function (`updateDigitDisplay`)**:
    -   Parses the input number string.
    -   Dynamically generates/updates the HTML structure.
    -   Preserves the container width based on the number of digits.

### Implementation Logic:

```javascript
function updateDigitDisplay(element, text) {
    // 1. Check if value actually changed to avoid unnecessary DOM updates
    if (element.dataset.value === text) return;
    
    // 2. Build HTML string with fixed-width spans
    let html = '<div class="digit-row">';
    for (let char of text) {
        if (/[0-9]/.test(char)) {
             // Standard digit
            html += `<span class="digit-box">${char}</span>`;
        } else if (/[.:]/.test(char)) {
             // Narrower separator
            html += `<span class="digit-separator">${char}</span>`;
        } else {
             // Units (e.g., 'km')
            html += `<span class="digit-unit">${char}</span>`;
        }
    }
    html += '</div>';
    
    // 3. Update DOM
    element.innerHTML = html;
}
```

### CSS Styling:
```css
.digit-row {
    display: inline-flex;
    justify-content: center;
    font-variant-numeric: tabular-nums;
}

.digit-box {
    display: inline-block;
    width: 0.65em; /* Fixed width for all digits 0-9 */
    text-align: center;
}
```

---

## 3. Performance & Stability Verification

### Unit Tests (`tests.js`):
1.  **Layout Stability Test (`checkDigitLayout`)**:
    -   Renders digits 0-9 in a hidden container.
    -   Measures the pixel width of each digit.
    -   Passes only if the width variation is < 1px (subpixel tolerance).
    
2.  **Performance Stress Test (`checkPerformance`)**:
    -   **Scenario**: 50+ independent digit containers updating simultaneously.
    -   **Frequency**: Every frame (approx. 60Hz).
    -   **Pass Criteria**: Average FPS >= 55, no significant frame drops.

### Visual Validation:
-   **No Jitter**: The total width of the HUD element (e.g., Distance) remains constant even when the number of decimal places changes (padded with fixed logic) or digits switch (e.g., "1" vs "8").
