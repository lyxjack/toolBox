---
name: content
category: content
type: anchor
confidence: 0.55
anchor_base: content-strategy
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - name: content-strategy
    confidence: 0.55
    origin: independent
  - name: frontend-slides
    confidence: 0.48
    origin: ECC
  - name: social-content
    confidence: 0.43
    origin: independent
  - name: article-writing
    confidence: 0.37
    origin: ECC
  - name: content-engine
    confidence: 0.37
    origin: ECC
iron_law: >
  This anchor file is immutable outside the formal merge process.
  Any modification must go through the full PM workflow with QA gate.
  Do not split, duplicate, or partially extract content from this file.
---

# Content

Unified anchor for all content skills: strategy, article writing, social media, content engine, and presentations. Plan content that drives traffic, builds authority, and generates leads by being searchable, shareable, or both.

---

## Part 1 — Content Strategy

### Before Planning

**Check for product marketing context first:**
If `.agents/product-marketing-context.md` exists (or `.claude/product-marketing-context.md` in older setups), read it before asking questions. Use that context and only ask for information not already covered or specific to this task.

Gather this context (ask if not provided):

#### 1. Business Context
- What does the company do?
- Who is the ideal customer?
- What is the primary goal for content? (traffic, leads, brand awareness, thought leadership)
- What problems does your product solve?

#### 2. Customer Research
- What questions do customers ask before buying?
- What objections come up in sales calls?
- What topics appear repeatedly in support tickets?
- What language do customers use to describe their problems?

#### 3. Current State
- Do you have existing content? What is working?
- What resources do you have? (writers, budget, time)
- What content formats can you produce? (written, video, audio)

#### 4. Competitive Landscape
- Who are your main competitors?
- What content gaps exist in your market?

### Searchable vs Shareable

Every piece of content must be searchable, shareable, or both. Prioritize in that order -- search traffic is the foundation.

**Searchable content** captures existing demand. Optimized for people actively looking for answers.

**Shareable content** creates demand. Spreads ideas and gets people talking.

#### Writing Searchable Content

- Target a specific keyword or question
- Match search intent exactly -- answer what the searcher wants
- Use clear titles that match search queries
- Structure with headings that mirror search patterns
- Place keywords in title, headings, first paragraph, URL
- Provide comprehensive coverage (do not leave questions unanswered)
- Include data, examples, and links to authoritative sources
- Optimize for AI/LLM discovery: clear positioning, structured content, brand consistency across the web

#### Writing Shareable Content

- Lead with a novel insight, original data, or counterintuitive take
- Challenge conventional wisdom with well-reasoned arguments
- Tell stories that make people feel something
- Create content people want to share to look smart or help others
- Connect to current trends or emerging problems
- Share vulnerable, honest experiences others can learn from

### Content Types

#### Searchable Content Types

**Use-Case Content**
Formula: [persona] + [use-case]. Targets long-tail keywords.
- "Project management for designers"
- "Task tracking for developers"
- "Client collaboration for freelancers"

**Hub and Spoke**
Hub = comprehensive overview. Spokes = related subtopics.
```
/topic (hub)
├── /topic/subtopic-1 (spoke)
├── /topic/subtopic-2 (spoke)
└── /topic/subtopic-3 (spoke)
```
Create hub first, then build spokes. Interlink strategically. Most content works fine under `/blog`. Only use dedicated hub/spoke URL structures for major topics with layered depth.

**Template Libraries**
High-intent keywords + product adoption.
- Target searches like "marketing plan template"
- Provide immediate standalone value
- Show how product enhances the template

#### Shareable Content Types

**Thought Leadership**
- Articulate concepts everyone feels but has not named
- Challenge conventional wisdom with evidence
- Share vulnerable, honest experiences

**Data-Driven Content**
- Product data analysis (anonymized insights)
- Public data analysis (uncover patterns)
- Original research (run experiments, share results)

**Expert Roundups**
15-30 experts answering one specific question. Built-in distribution.

**Case Studies**
Structure: Challenge -> Solution -> Results -> Key learnings

**Meta Content**
Behind-the-scenes transparency. "How We Got Our First $5k MRR," "Why We Chose Debt Over VC."

### Content Pillars and Topic Clusters

Content pillars are the 3-5 core topics your brand will own. Each pillar spawns a cluster of related content.

#### How to Identify Pillars

1. **Product-led**: What problems does your product solve?
2. **Audience-led**: What does your ICP need to learn?
3. **Search-led**: What topics have volume in your space?
4. **Competitor-led**: What are competitors ranking for?

#### Pillar Structure

```
Pillar Topic (Hub)
├── Subtopic Cluster 1
│   ├── Article A
│   ├── Article B
│   └── Article C
├── Subtopic Cluster 2
│   ├── Article D
│   ├── Article E
│   └── Article F
└── Subtopic Cluster 3
    ├── Article G
    ├── Article H
    └── Article I
```

Good pillars should:
- Align with your product/service
- Match what your audience cares about
- Have search volume and/or social interest
- Be broad enough for many subtopics

### Keyword Research by Buyer Stage

Map topics to the buyer's journey using proven keyword modifiers:

**Awareness Stage** — Modifiers: "what is," "how to," "guide to," "introduction to"

**Consideration Stage** — Modifiers: "best," "top," "vs," "alternatives," "comparison"

**Decision Stage** — Modifiers: "pricing," "reviews," "demo," "trial," "buy"

**Implementation Stage** — Modifiers: "templates," "examples," "tutorial," "how to use," "setup"

### Content Ideation Sources

#### Keyword Data
If user provides keyword exports (Ahrefs, SEMrush, GSC), analyze for:
- Topic clusters (group related keywords)
- Buyer stage (awareness/consideration/decision/implementation)
- Search intent (informational, commercial, transactional)
- Quick wins (low competition + decent volume + high relevance)
- Content gaps (keywords competitors rank for that you don't)

Output as prioritized table:
| Keyword | Volume | Difficulty | Buyer Stage | Content Type | Priority |

#### Call Transcripts
Extract from sales or customer call transcripts:
- Questions asked -> FAQ content or blog posts
- Pain points -> problems in their own words
- Objections -> content to address proactively
- Language patterns -> exact phrases to use (voice of customer)
- Competitor mentions -> what they compared you to

#### Survey Responses
Mine for:
- Open-ended responses (topics and language)
- Common themes (30%+ mention = high priority)
- Resource requests (what they wish existed)
- Content preferences (formats they want)

#### Forum Research
Use web search to find content ideas:
- **Reddit:** `site:reddit.com [topic]` — top posts, questions, upvoted answers
- **Quora:** `site:quora.com [topic]` — most-followed questions, highly upvoted answers
- **Other:** Indie Hackers, Hacker News, Product Hunt, industry Slack/Discord

#### Competitor Analysis
- Find their content: `site:competitor.com/blog`
- Analyze top-performing posts, topics covered, gaps, case studies, content structure
- Identify topics you can cover better, angles they miss, outdated content to improve

#### Sales and Support Input
- Common objections
- Repeated questions
- Support ticket patterns
- Success stories
- Feature requests and underlying problems

### Prioritizing Content Ideas

Score each idea on four factors:

1. **Customer Impact (40%)** — frequency, percentage affected, emotional charge, LTV potential
2. **Content-Market Fit (30%)** — product alignment, unique insights, customer stories, natural product interest
3. **Search Potential (20%)** — monthly volume, competition, long-tail opportunities, trend direction
4. **Resource Requirements (10%)** — expertise available, additional research needed, asset requirements

### Strategy Output Format

When creating a content strategy, provide:

1. **Content Pillars** — 3-5 pillars with rationale, subtopic clusters, product connection
2. **Priority Topics** — topic/title, searchable/shareable, content type, target keyword and buyer stage, customer research backing
3. **Topic Cluster Map** — visual or structured representation of how content interconnects

---

## Part 2 — Article Writing

Write long-form content that sounds like a real person or brand, not generic AI output.

### When to Activate

- Drafting blog posts, essays, launch posts, guides, tutorials, or newsletter issues
- Turning notes, transcripts, or research into polished articles
- Matching an existing founder, operator, or brand voice from examples
- Tightening structure, pacing, and evidence in already-written long-form copy

### Core Writing Rules

1. Lead with the concrete thing: example, output, anecdote, number, screenshot description, or code block.
2. Explain after the example, not before.
3. Prefer short, direct sentences over padded ones.
4. Use specific numbers when available and sourced.
5. Never invent biographical facts, company metrics, or customer evidence.

### Voice Capture Workflow

If the user wants a specific voice, collect one or more of:
- Published articles, newsletters, X / LinkedIn posts, docs or memos, a short style guide

Then extract:
- Sentence length and rhythm
- Whether the voice is formal, conversational, or sharp
- Favored rhetorical devices such as parentheses, lists, fragments, or questions
- Tolerance for humor, opinion, and contrarian framing
- Formatting habits such as headers, bullets, code blocks, and pull quotes

If no voice references are given, default to a direct, operator-style voice: concrete, practical, and low on hype.

### Banned Patterns

Delete and rewrite any of these:
- Generic openings like "In today's rapidly evolving landscape"
- Filler transitions such as "Moreover" and "Furthermore"
- Hype phrases like "game-changer", "cutting-edge", or "revolutionary"
- Vague claims without evidence
- Biography or credibility claims not backed by provided context

### Writing Process

1. Clarify the audience and purpose.
2. Build a skeletal outline with one purpose per section.
3. Start each section with evidence, example, or scene.
4. Expand only where the next sentence earns its place.
5. Remove anything that sounds templated or self-congratulatory.

### Structure Guidance

**Technical Guides** — open with what the reader gets; use code or terminal examples in every major section; end with concrete takeaways.

**Essays / Opinion Pieces** — start with tension, contradiction, or a sharp observation; keep one argument thread per section; use examples that earn the opinion.

**Newsletters** — keep the first screen strong; mix insight with updates, not diary filler; use clear section labels and easy skim structure.

---

## Part 3 — Social Media Content

Create engaging content that builds audience, drives engagement, and supports business goals across platforms.

### Platform Quick Reference

| Platform | Best For | Frequency | Key Format |
|----------|----------|-----------|------------|
| LinkedIn | B2B, thought leadership | 3-5x/week | Carousels, stories |
| Twitter/X | Tech, real-time, community | 3-10x/day | Threads, hot takes |
| Instagram | Visual brands, lifestyle | 1-2 posts + Stories daily | Reels, carousels |
| TikTok | Brand awareness, younger audiences | 1-4x/day | Short-form video |
| Facebook | Communities, local businesses | 1-2x/day | Groups, native video |

### Social Content Pillars Framework

Build content around 3-5 pillars aligned with expertise and audience interests.

Example for a SaaS Founder:

| Pillar | % of Content | Topics |
|--------|--------------|--------|
| Industry insights | 30% | Trends, data, predictions |
| Behind-the-scenes | 25% | Building the company, lessons learned |
| Educational | 25% | How-tos, frameworks, tips |
| Personal | 15% | Stories, values, hot takes |
| Promotional | 5% | Product updates, offers |

### Hook Formulas

The first line determines whether anyone reads the rest.

**Curiosity Hooks**
- "I was wrong about [common belief]."
- "The real reason [outcome] happens isn't what you think."
- "[Impressive result] -- and it only took [surprisingly short time]."

**Story Hooks**
- "Last week, [unexpected thing] happened."
- "I almost [big mistake/failure]."
- "3 years ago, I [past state]. Today, [current state]."

**Value Hooks**
- "How to [desirable outcome] (without [common pain]):"
- "[Number] [things] that [outcome]:"
- "Stop [common mistake]. Do this instead:"

**Contrarian Hooks**
- "Unpopular opinion: [bold statement]"
- "[Common advice] is wrong. Here's why:"
- "I stopped [common practice] and [positive result]."

### Platform-Specific Guidance

**X** — open fast; one idea per post or per tweet in a thread; keep links out of the main body unless necessary; avoid hashtag spam.

**LinkedIn** — strong first line; short paragraphs; more explicit framing around lessons, results, and takeaways.

**TikTok / Short Video** — first 3 seconds must interrupt attention; script around visuals, not just narration; one demo, one claim, one CTA.

**YouTube** — show the result early; structure by chapter; refresh the visual every 20-30 seconds.

### Content Repurposing System

Turn one piece of content into many. Default cascade:

1. **Anchor asset**: article, video, demo, memo, or launch doc
2. **Extract** 3-7 atomic ideas
3. **Write** platform-native variants
4. **Trim** repetition across outputs
5. **Align** CTAs with platform intent

Blog Post -> Social Content:

| Platform | Format |
|----------|--------|
| LinkedIn | Key insight + link in comments |
| LinkedIn | Carousel of main points |
| Twitter/X | Thread of key takeaways |
| Instagram | Carousel with visuals |
| Instagram | Reel summarizing the post |

### Content Calendar Structure

Weekly Planning Template:

| Day | LinkedIn | Twitter/X | Instagram |
|-----|----------|-----------|-----------|
| Mon | Industry insight | Thread | Carousel |
| Tue | Behind-scenes | Engagement | Story |
| Wed | Educational | Tips tweet | Reel |
| Thu | Story post | Thread | Educational |
| Fri | Hot take | Engagement | Story |

Batching Strategy (2-3 hours weekly):
1. Review content pillar topics
2. Write 5 LinkedIn posts
3. Write 3 Twitter threads + daily tweets
4. Create Instagram carousel + Reel ideas
5. Schedule everything
6. Leave room for real-time engagement

### Engagement Strategy

**Daily Engagement Routine (30 min):**
1. Respond to all comments on your posts (5 min)
2. Comment on 5-10 posts from target accounts (15 min)
3. Share/repost with added insight (5 min)
4. Send 2-3 DMs to new connections (5 min)

**Quality Comments:** Add new insight, share a related experience, ask a thoughtful follow-up question, respectfully disagree with nuance.

**Building Relationships:** Identify 20-50 accounts in your space; consistently engage with their content; share with credit; collaborate eventually.

### Analytics and Optimization

**Metrics That Matter:**
- Awareness: Impressions, Reach, Follower growth rate
- Engagement: Engagement rate, Comments, Shares/reposts, Saves
- Conversion: Link clicks, Profile visits, DMs received, Leads attributed

**Weekly Review:** Top 3 and bottom 3 posts, follower growth trend, engagement rate trend, best posting times.

**Optimization Actions:**
- Low engagement: test new hooks, post at different times, try different formats, increase engagement with others
- Declining reach: avoid external links in post body, increase posting frequency, engage more in comments, test video/visual content

### Reverse Engineering Viral Content

1. **Find creators** -- 10-20 accounts with high engagement
2. **Collect data** -- 500+ posts for analysis
3. **Analyze patterns** -- hooks, formats, CTAs that work
4. **Codify playbook** -- document repeatable patterns
5. **Layer your voice** -- apply patterns with authenticity
6. **Convert** -- bridge attention to business results

### Campaign Deliverables

When asked for a campaign, return:
- The core angle
- Platform-specific drafts
- Optional posting order
- Optional CTA variants
- Any missing inputs needed before publishing

---

## Part 4 — Presentations (Frontend Slides)

Create zero-dependency, animation-rich HTML presentations that run entirely in the browser.

### When to Activate

- Creating a talk deck, pitch deck, workshop deck, or internal presentation
- Converting `.ppt` or `.pptx` slides into an HTML presentation
- Improving an existing HTML presentation layout, motion, or typography
- Exploring presentation styles with a user who does not know their design preference yet

### Non-Negotiables

1. **Zero dependencies**: default to one self-contained HTML file with inline CSS and JS.
2. **Viewport fit is mandatory**: every slide must fit inside one viewport with no internal scrolling.
3. **Show, don't tell**: use visual previews instead of abstract style questionnaires.
4. **Distinctive design**: avoid generic purple-gradient, Inter-on-white, template-looking decks.
5. **Production quality**: keep code commented, accessible, responsive, and performant.

### Presentation Workflow

1. **Detect Mode**: new presentation, PPT conversion, or enhancement
2. **Discover Content**: purpose, length, content state
3. **Discover Style**: mood-based visual exploration with 3 single-slide previews
4. **Build**: semantic slide sections, viewport-safe CSS, CSS custom properties, presentation controller, Intersection Observer, reduced-motion support
5. **Enforce Viewport Fit**: `height: 100vh; height: 100dvh; overflow: hidden;` on every slide, `clamp()` for all type and spacing, split slides when content overflows
6. **Validate**: check at 1920x1080, 1280x720, 768x1024, 375x667, 667x375
7. **Deliver**: delete previews, open deck, summarize file path and customization points

### Content Density Limits

| Slide type | Limit |
|------------|-------|
| Title | 1 heading + 1 subtitle + optional tagline |
| Content | 1 heading + 4-6 bullets or 2 short paragraphs |
| Feature grid | 6 cards max |
| Code | 8-10 lines max |
| Quote | 1 quote + attribution |
| Image | 1 image constrained by viewport |

### PPT / PPTX Conversion

1. Prefer `python3` with `python-pptx` to extract text, images, and notes.
2. If `python-pptx` is unavailable, ask whether to install it or fall back to manual workflow.
3. Preserve slide order, speaker notes, and extracted assets.
4. After extraction, run the same style-selection workflow.

### Implementation Requirements

**HTML/CSS:** Inline CSS and JS by default. Fonts from Google Fonts or Fontshare. Atmospheric backgrounds, strong type hierarchy, clear visual direction. Abstract shapes, gradients, grids, noise, and geometry rather than illustrations.

**JavaScript:** Keyboard navigation, touch/swipe navigation, mouse wheel navigation, progress indicator, reveal-on-enter animation triggers.

**Accessibility:** Semantic structure (`main`, `section`, `nav`), readable contrast, keyboard-only navigation, `prefers-reduced-motion` support.

### Anti-Patterns

- Generic startup gradients with no visual identity
- System-font decks unless intentionally editorial
- Long bullet walls
- Code blocks that need scrolling
- Fixed-height content boxes that break on short screens
- Invalid negated CSS functions like `-clamp(...)`

---

## Quality Gates

### Article Quality Gate
- Verify factual claims against provided sources
- Remove filler and corporate language
- Confirm voice matches supplied examples
- Ensure every section adds new information
- Check formatting for the intended platform

### Social Content Quality Gate
- Each draft reads natively for its platform
- Hooks are strong and specific
- No generic hype language
- No duplicated copy across platforms unless requested
- The CTA matches the content and audience

### Presentation Quality Gate
- Presentation runs from a local file in a browser
- Every slide fits the viewport without scrolling
- Style is distinctive and intentional
- Animation is meaningful, not noisy
- Reduced motion is respected
- File paths and customization points are explained at handoff

---

## Related Skills

- **copywriting**: For writing individual content pieces
- **seo-audit**: For technical SEO and on-page optimization
- **ai-seo**: For optimizing content for AI search engines and getting cited by LLMs
- **programmatic-seo**: For scaled content generation
- **site-architecture**: For page hierarchy, navigation design, and URL structure
- **email-sequence**: For email-based content
- **launch-strategy**: For coordinating social with launches
- **marketing-psychology**: For understanding what drives engagement
- **frontend-patterns**: For component and interaction patterns around decks
- **liquid-glass-design**: For Apple glass aesthetics in presentations
- **e2e-testing**: For automated browser verification of decks

---

## Task-Specific Questions

1. What patterns emerge from your last 10 customer conversations?
2. What questions keep coming up in sales calls?
3. Where are competitors' content efforts falling short?
4. What unique insights from customer research are not being shared elsewhere?
5. Which existing content drives the most conversions, and why?
6. What platform(s) are you focusing on?
7. What is your current posting frequency?
8. Do you have existing content to repurpose?
9. How much time can you dedicate weekly?
10. Are you building personal brand, company brand, or both?
