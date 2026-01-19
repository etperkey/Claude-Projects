# PDF Generation Tools

**Puppeteer-based PDF generation for print-ready documents**

## About

This project contains tools for generating high-quality PDFs from HTML sources, with support for custom page sizes, compression, and print-optimized styling.

## Current Projects

### Chicago Dive Bar Calendar 2026

A punk-styled dive bar calendar featuring Chicago establishments. Generates a print-ready landscape letter-size PDF with:

- Chicago flag color theme
- High-resolution images (150 DPI, 2x device scale)
- Cover page and monthly spreads
- Compressed version option for sharing

## Tech Stack

- **Puppeteer** - Headless Chrome for HTML rendering
- **pdf-lib** - PDF manipulation and compression

## Usage

```bash
# Install dependencies
npm install

# Serve the HTML file locally (required)
# Use any local server on port 8080

# Generate full-quality PDF
node generate-pdf.js

# Generate compressed PDF
node generate-pdf.js --compress
```

## Output Files

- `chicago-dive-bar-calendar-2026.pdf` - Full quality (~45MB)
- `chicago-dive-bar-calendar-2026-compressed.pdf` - Compressed (~7MB)

## Notes

- HTML source must be served locally before PDF generation
- Full quality version recommended for professional printing
- Compressed version suitable for digital sharing
