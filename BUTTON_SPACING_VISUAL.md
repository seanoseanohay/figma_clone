# Header Button Spacing Visual Guide

## Complete Header Layout with Measurements

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                             │
│  CollabCanvas [MVP]    [Project > Canvas ▼]      [👤][👤][👤][👤]    [Invite]  [Sign out]  │
│                                                                                             │
│  ←────────────────────→ ←──────────────────────→ ←──────────────→ ←─────→ ←────→          │
│    Logo + Badge              Project Selector         User Grid     Actions                │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Detailed Button Spacing (Right Side)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  [👤 User 1]  [👤 User 2]  [👤 User 3]  [👤 Me]      [Invite]      [Sign out] │
│   8px gap      8px gap      8px gap     8px gap   16px gap     12px gap      │
│                                                                               │
│  ├─────────────────── User Squares ──────────────┤                           │
│                                                   └─16px─→                    │
│                                                                               │
│                                          [Invite Button]                      │
│                                                   └─12px─→                    │
│                                                                               │
│                                                          [Sign Out Button]    │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Button Dimensions

### User Squares
```
┌─────────┐
│         │  ← 32px height
│    M    │
│         │
└─────────┘
   32px width
   
- Size: 32x32px (w-8 h-8)
- Border radius: 2px (rounded-sm)
- Spacing between squares: 8px (marginRight: '8px')
- Current user has ring-2 ring-gray-800
```

### Invite Button
```
┌────────────────────────────┐
│  [👤+]  Invite             │  ← 38px height (px-3 py-2)
└────────────────────────────┘
   ~90px width (auto)

- Height: px-3 py-2 (12px top/bottom padding)
- Border: 1px solid gray-300
- Text: text-sm leading-4 font-medium
- Icon: 16x16px (w-4 h-4) with 8px right margin (mr-2)
- Right margin to Sign Out: 12px (marginRight: '12px')
```

### Sign Out Button
```
┌────────────────────────────┐
│  Sign out                  │  ← 38px height (px-3 py-2)
└────────────────────────────┘
   ~95px width (auto)

- Height: px-3 py-2 (12px top/bottom padding) - SAME AS INVITE
- Border: 1px solid gray-300
- Text: text-sm leading-4 font-medium
```

## Spacing Measurements

### Horizontal Spacing (Right Side of Header)
```
User Squares Section: [16px margin-right] → Invite Button: [12px margin-right] → Sign Out Button
```

### Vertical Alignment
```
All elements are vertically centered using:
- Parent: flex items-center
- Ensures perfect alignment regardless of content
```

## Color & Style Consistency

### Both Buttons Share:
```css
• Base: bg-white border border-gray-300
• Text: text-gray-700 text-sm leading-4 font-medium
• Shadow: shadow-sm
• Padding: px-3 py-2 (identical height)
• Border radius: rounded-md
• Hover: hover:bg-gray-50
• Focus: focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
• Transition: transition-colors
```

### Invite Button Specifics:
```css
• Icon: User with plus sign (24x24 viewBox, 16x16 display)
• Icon color: Inherits text color (text-gray-700)
• Icon margin: mr-2 (8px right spacing)
```

## Responsive Behavior

### Desktop (≥1200px)
```
[Logo] [Dropdown] [User Squares] [Invite] [Sign out]
All visible with full text
```

### Tablet (768-1199px)
```
[Logo] [Dropdown] [User Squares] [👤+] [Sign out]
Invite text hidden, icon-only (future enhancement)
```

### Mobile (<768px)
```
[Logo] [☰ Hamburger]
All moved to mobile menu
```

## Code Reference

### User Squares Container
```jsx
<div className="flex items-center" style={{ marginRight: '16px' }}>
  {/* User squares here */}
</div>
```

### Invite Button
```jsx
<button
  onClick={() => setInviteModalOpen(true)}
  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
  style={{ marginRight: '12px' }}
>
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
  <span className="inline">Invite</span>
</button>
```

### Sign Out Button
```jsx
<button
  onClick={handleSignOut}
  disabled={loading}
  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  {loading ? (
    <>
      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="inline">Signing out...</span>
    </>
  ) : (
    <span className="inline">Sign out</span>
  )}
</button>
```

## Visual Comparison Table

| Element          | Width    | Height | Margin Right | Padding | Border Radius |
|------------------|----------|--------|--------------|---------|---------------|
| User Square      | 32px     | 32px   | 8px          | -       | 2px           |
| Current User     | 32px     | 32px   | 8px          | -       | 2px           |
| +N Indicator     | 32px     | 32px   | 8px          | -       | 2px           |
| User Section End | -        | -      | **16px**     | -       | -             |
| Invite Button    | ~90px    | 38px   | **12px**     | 12px    | 6px           |
| Sign Out Button  | ~95px    | 38px   | 0px          | 12px    | 6px           |

## Pixel-Perfect Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [32×32] [32×32] [32×32] [32×32]     [~90×38]      [~95×38]   │
│    User    User    User     Me        Invite       Sign out    │
│     8px     8px     8px     8px        16px          12px      │
│                                    (from users)  (from invite)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Confirmation

✅ **Spacing Verified:**
- User squares to Invite button: 16px gap
- Invite button to Sign Out button: 12px gap

✅ **Height Verified:**
- Both buttons use `px-3 py-2` (identical heights)

✅ **Alignment Verified:**
- Parent container uses `flex items-center`
- All elements vertically centered

✅ **Styling Verified:**
- Both buttons share identical base styles
- Only difference: Invite has icon, Sign Out has loading state

---

## Summary

The implementation creates perfect visual balance with:
- **Consistent button heights** (38px)
- **Appropriate spacing** (16px from users, 12px between buttons)
- **Matching visual styles** (same colors, borders, shadows)
- **Professional appearance** (clean, modern, accessible)



