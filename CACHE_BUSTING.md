# Cache Busting Strategy

## Overview
This app implements cache busting to ensure users always get the latest version when deployed to GitHub Pages.

## Implementation

### 1. Meta Tags (index.html)
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

### 2. Version Parameters
- CSS: `style.css?v=1.1.0`
- JavaScript: `script.js?v=1.1.0`

### 3. Version Tracking (script.js)
- App version stored in `this.version`
- Version checking function detects updates
- Future data migration capabilities

## Updating Versions

When making changes:

1. **Update version numbers** in:
   - `index.html` (CSS and JS file references)
   - `script.js` (this.version property)
   - `script.js` (version comment)

2. **Version format**: Use semantic versioning (e.g., 1.2.0)
   - Major: Breaking changes or major features
   - Minor: New features, significant updates
   - Patch: Bug fixes, small improvements

## Current Version: 1.1.0
- Cache busting implementation
- Test data cleanup
- Removed persistent test file

## Benefits
- Forces browser to fetch latest files
- Prevents stale cached versions
- Version tracking for future data migrations
- Better user experience with up-to-date app