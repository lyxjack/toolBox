---
name: business
category: business
type: anchor
confidence: 0.53
anchor_base: nutrient-document-processing
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - name: nutrient-document-processing
    confidence: 0.53
    origin: ECC
  - name: visa-doc-translate
    confidence: 0.38
    origin: ECC
  - name: investor-materials
    confidence: 0.33
    origin: ECC
  - name: investor-outreach
    confidence: 0.30
    origin: ECC
  - name: market-research
    confidence: 0.30
    origin: ECC

iron_law: >
  This anchor file is immutable outside the formal merge process.
  Any modification must go through the full PM workflow with QA gate.
  Do not split, duplicate, or partially extract content from this file.
---

# Business

Unified anchor for all business skills: document processing, document translation, investor materials, investor outreach, and market research. Covers the full spectrum from document operations to fundraising and market intelligence.

---

## Part 1 — Document Processing (Nutrient API)

Process documents with the [Nutrient DWS Processor API](https://www.nutrient.io/api/). Convert formats, extract text and tables, OCR scanned documents, redact PII, add watermarks, digitally sign, and fill PDF forms.

### Setup

Get a free API key at **[nutrient.io](https://dashboard.nutrient.io/sign_up/?product=processor)**

```bash
export NUTRIENT_API_KEY="pdf_live_..."
```

All requests go to `https://api.nutrient.io/build` as multipart POST with an `instructions` JSON field.

### Convert Documents

```bash
# DOCX to PDF
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.docx=@document.docx" \
  -F 'instructions={"parts":[{"file":"document.docx"}]}' \
  -o output.pdf

# PDF to DOCX
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"output":{"type":"docx"}}' \
  -o output.docx

# HTML to PDF
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "index.html=@index.html" \
  -F 'instructions={"parts":[{"html":"index.html"}]}' \
  -o output.pdf
```

Supported inputs: PDF, DOCX, XLSX, PPTX, DOC, XLS, PPT, PPS, PPSX, ODT, RTF, HTML, JPG, PNG, TIFF, HEIC, GIF, WebP, SVG, TGA, EPS.

### Extract Text and Data

```bash
# Extract plain text
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"output":{"type":"text"}}' \
  -o output.txt

# Extract tables as Excel
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"output":{"type":"xlsx"}}' \
  -o tables.xlsx
```

### OCR Scanned Documents

```bash
# OCR to searchable PDF (supports 100+ languages)
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "scanned.pdf=@scanned.pdf" \
  -F 'instructions={"parts":[{"file":"scanned.pdf"}],"actions":[{"type":"ocr","language":"english"}]}' \
  -o searchable.pdf
```

Languages: Supports 100+ languages via ISO 639-2 codes (e.g., `eng`, `deu`, `fra`, `spa`, `jpn`, `kor`, `chi_sim`, `chi_tra`, `ara`, `hin`, `rus`). Full language names like `english` or `german` also work. See the [complete OCR language table](https://www.nutrient.io/guides/document-engine/ocr/language-support/) for all supported codes.

### Redact Sensitive Information

```bash
# Pattern-based (SSN, email)
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"redaction","strategy":"preset","strategyOptions":{"preset":"social-security-number"}},{"type":"redaction","strategy":"preset","strategyOptions":{"preset":"email-address"}}]}' \
  -o redacted.pdf

# Regex-based
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"redaction","strategy":"regex","strategyOptions":{"regex":"\\b[A-Z]{2}\\d{6}\\b"}}]}' \
  -o redacted.pdf
```

Redaction presets: `social-security-number`, `email-address`, `credit-card-number`, `international-phone-number`, `north-american-phone-number`, `date`, `time`, `url`, `ipv4`, `ipv6`, `mac-address`, `us-zip-code`, `vin`.

### Add Watermarks

```bash
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"watermark","text":"CONFIDENTIAL","fontSize":72,"opacity":0.3,"rotation":-45}]}' \
  -o watermarked.pdf
```

### Digital Signatures

```bash
# Self-signed CMS signature
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"sign","signatureType":"cms"}]}' \
  -o signed.pdf
```

### Fill PDF Forms

```bash
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "form.pdf=@form.pdf" \
  -F 'instructions={"parts":[{"file":"form.pdf"}],"actions":[{"type":"fillForm","formFields":{"name":"Jane Smith","email":"jane@example.com","date":"2026-02-06"}}]}' \
  -o filled.pdf
```

### MCP Server (Alternative)

For native tool integration, use the MCP server instead of curl:

```json
{
  "mcpServers": {
    "nutrient-dws": {
      "command": "npx",
      "args": ["-y", "@nutrient-sdk/dws-mcp-server"],
      "env": {
        "NUTRIENT_DWS_API_KEY": "YOUR_API_KEY",
        "SANDBOX_PATH": "/path/to/working/directory"
      }
    }
  }
}
```

### Document Processing Links

- [API Playground](https://dashboard.nutrient.io/processor-api/playground/)
- [Full API Docs](https://www.nutrient.io/guides/dws-processor/)
- [npm MCP Server](https://www.npmjs.com/package/@nutrient-sdk/dws-mcp-server)

---

## Part 2 — Visa Document Translation

Translate visa application documents through an automated pipeline: image conversion, rotation, OCR, translation, and PDF generation.

### Automated Pipeline

When the user provides an image file path, execute these steps without asking for confirmation:

1. **Image Conversion**: If the file is HEIC, convert to PNG using `sips -s format png <input> --out <output>`
2. **Image Rotation**: Check EXIF orientation data and rotate accordingly. If EXIF orientation is 6, rotate 90 degrees counterclockwise. Apply additional rotation if the document appears upside down.
3. **OCR Text Extraction**: Try multiple methods in order:
   - macOS Vision framework (preferred for macOS)
   - EasyOCR (cross-platform, no tesseract required)
   - Tesseract OCR (if available)
4. **Translation**: Translate all text to English professionally. Maintain original structure. Use visa-appropriate terminology. Keep proper names in original language with English in parentheses. For Chinese names, use pinyin format (e.g., WU Zhengye). Preserve all numbers, dates, and amounts.
5. **PDF Generation**: Create using PIL and reportlab. Page 1: rotated original image centered on A4. Page 2: English translation with professional formatting and certification note.
6. **Output**: `<original_filename>_Translated.pdf` in the same directory.

### Supported Documents

- Bank deposit certificates
- Income certificates
- Employment certificates
- Retirement certificates
- Property certificates
- Business licenses
- ID cards and passports
- Other official documents

### Technical Implementation

**OCR Methods (tried in order):**

1. macOS Vision Framework (macOS only):
   ```python
   import Vision
   from Foundation import NSURL
   ```

2. EasyOCR (cross-platform):
   ```bash
   pip install easyocr
   ```

3. Tesseract OCR (if available):
   ```bash
   brew install tesseract tesseract-lang
   pip install pytesseract
   ```

**Required Python Libraries:**
```bash
pip install pillow reportlab
```

For macOS Vision framework:
```bash
pip install pyobjc-framework-Vision pyobjc-framework-Quartz
```

### Translation Guidelines

- Do not ask for user confirmation at each step
- Automatically determine the best rotation angle
- Try multiple OCR methods if one fails
- Ensure all numbers, dates, and amounts are accurately translated
- Use clean, professional formatting
- Complete the entire process and report the final PDF location

---

## Part 3 — Investor Materials

Build investor-facing materials that are consistent, credible, and easy to defend.

### When to Activate

- Creating or revising a pitch deck
- Writing an investor memo or one-pager
- Building a financial model, milestone plan, or use-of-funds table
- Answering accelerator or incubator application questions
- Aligning multiple fundraising docs around one source of truth

### Golden Rule

All investor materials must agree with each other.

Create or confirm a single source of truth before writing:
- Traction metrics
- Pricing and revenue assumptions
- Raise size and instrument
- Use of funds
- Team bios and titles
- Milestones and timelines

If conflicting numbers appear, stop and resolve them before drafting.

### Core Workflow

1. Inventory the canonical facts
2. Identify missing assumptions
3. Choose the asset type
4. Draft the asset with explicit logic
5. Cross-check every number against the source of truth

### Asset Guidance

**Pitch Deck** — Recommended flow:
1. Company + wedge
2. Problem
3. Solution
4. Product / demo
5. Market
6. Business model
7. Traction
8. Team
9. Competition / differentiation
10. Ask
11. Use of funds / milestones
12. Appendix

**One-Pager / Memo:**
- State what the company does in one clean sentence
- Show why now
- Include traction and proof points early
- Make the ask precise
- Keep claims easy to verify

**Financial Model:**
- Explicit assumptions
- Bear / base / bull cases when useful
- Clean layer-by-layer revenue logic
- Milestone-linked spending
- Sensitivity analysis where the decision hinges on assumptions

**Accelerator Applications:**
- Answer the exact question asked
- Prioritize traction, insight, and team advantage
- Avoid puffery
- Keep internal metrics consistent with the deck and model

### Investor Materials Red Flags

- Unverifiable claims
- Fuzzy market sizing without assumptions
- Inconsistent team roles or titles
- Revenue math that does not sum cleanly
- Inflated certainty where assumptions are fragile

---

## Part 4 — Investor Outreach

Write investor communication that is short, personalized, and easy to act on.

### When to Activate

- Writing a cold email to an investor
- Drafting a warm intro request
- Sending follow-ups after a meeting or no response
- Writing investor updates during a process
- Tailoring outreach based on fund thesis or partner fit

### Core Rules

1. Personalize every outbound message.
2. Keep the ask low-friction.
3. Use proof, not adjectives.
4. Stay concise.
5. Never send generic copy that could go to any investor.

### Cold Email Structure

1. **Subject line**: short and specific
2. **Opener**: why this investor specifically
3. **Pitch**: what the company does, why now, what proof matters
4. **Ask**: one concrete next step
5. **Sign-off**: name, role, one credibility anchor if needed

### Personalization Sources

Reference one or more of:
- Relevant portfolio companies
- A public thesis, talk, post, or article
- A mutual connection
- A clear market or product fit with the investor's focus

If context is missing, ask for it or state that the draft is a template awaiting personalization.

### Follow-Up Cadence

Default:
- Day 0: initial outbound
- Day 4-5: short follow-up with one new data point
- Day 10-12: final follow-up with a clean close

Do not keep nudging after that unless the user wants a longer sequence.

### Warm Intro Requests

Make life easy for the connector:
- Explain why the intro is a fit
- Include a forwardable blurb
- Keep the forwardable blurb under 100 words

### Post-Meeting Updates

Include:
- The specific thing discussed
- The answer or update promised
- One new proof point if available
- The next step

---

## Part 5 — Market Research

Produce research that supports decisions, not research theater.

### When to Activate

- Researching a market, category, company, investor, or technology trend
- Building TAM/SAM/SOM estimates
- Comparing competitors or adjacent products
- Preparing investor dossiers before outreach
- Pressure-testing a thesis before building, funding, or entering a market

### Research Standards

1. Every important claim needs a source.
2. Prefer recent data and call out stale data.
3. Include contrarian evidence and downside cases.
4. Translate findings into a decision, not just a summary.
5. Separate fact, inference, and recommendation clearly.

### Common Research Modes

**Investor / Fund Diligence** — Collect:
- Fund size, stage, and typical check size
- Relevant portfolio companies
- Public thesis and recent activity
- Reasons the fund is or is not a fit
- Any obvious red flags or mismatches

**Competitive Analysis** — Collect:
- Product reality, not marketing copy
- Funding and investor history if public
- Traction metrics if public
- Distribution and pricing clues
- Strengths, weaknesses, and positioning gaps

**Market Sizing** — Use:
- Top-down estimates from reports or public datasets
- Bottom-up sanity checks from realistic customer acquisition assumptions
- Explicit assumptions for every leap in logic

**Technology / Vendor Research** — Collect:
- How it works
- Trade-offs and adoption signals
- Integration complexity
- Lock-in, security, compliance, and operational risk

### Research Output Format

Default structure:
1. Executive summary
2. Key findings
3. Implications
4. Risks and caveats
5. Recommendation
6. Sources

---

## Quality Gates

### Document Processing Quality Gate
- Correct format conversion verified
- OCR output reviewed for accuracy
- Redaction covers all required PII patterns
- Watermarks and signatures applied correctly
- Form fields populated accurately

### Translation Quality Gate
- All numbers, dates, and amounts accurately preserved
- Professional terminology appropriate for visa applications
- Original document structure maintained
- Proper names handled correctly (pinyin for Chinese names)
- Certification note included on translated page

### Investor Materials Quality Gate
- Every number matches the current source of truth
- Use of funds and revenue layers sum correctly
- Assumptions are visible, not buried
- The story is clear without hype language
- The final asset is defensible in a partner meeting

### Outreach Quality Gate
- Message is personalized
- The ask is explicit
- There is no fluff or begging language
- The proof point is concrete
- Word count stays tight

### Market Research Quality Gate
- All numbers are sourced or labeled as estimates
- Old data is flagged
- The recommendation follows from the evidence
- Risks and counterarguments are included
- The output makes a decision easier

---

## Related Skills

- **frontend-slides**: For web-native pitch decks and presentations
- **content-strategy**: For content planning that supports business goals
- **copywriting**: For writing marketing and sales copy
- **email-sequence**: For nurturing investor and customer relationships
- **seo-audit**: For technical SEO on business content
