Building 1,000 polished extensions in 10 days is a high-speed industrial operation. To achieve this, you have to stop being a **coder** and start being a **Factory Manager**.

At 100 extensions per day, you cannot prompt manually. You need an **Autonomous Orchestration Loop**. Here is the clear path to building your "Extension Factory."

-----

## 1\. The Strategy: "Template Injection"

Instead of starting from zero for every extension, you use a **Master Boilerplate**. Every extension will share 90% of the same code (the "DeepCycle" design DNA); only the 10% (the specific logic) changes.

### The File Structure (The Factory Seed)

Create a folder called `_MASTER_TEMPLATE`. Inside it, put your `.agents/` folder with the locked rules we created:

  * **`DESIGN.md`**: Fixed DeepCycle colors (\#002719, \#AEED22).
  * **`AGENTS.md`**: Fixed Chrome Extension Specialist personality.
  * **`skills/global-ui.md`**: Fixed Header/Footer logic.

-----

## 2\. The Path: Two Automation Methods

To run Antigravity automatically for 1,000 items, you have two choices. **Option A** is the industry standard for mass-production.

### Option A: External Automation (Playwright + Python)

This is the most "Battle-Proof" way. You write a script that controls your browser, logs into Antigravity, and feeds it prompts from a list.

**The Workflow:**

1.  **Preparation:** Create a `list.json` containing 1,000 entries (Name, Problem, Key Features).
2.  **The Script:**
      * Create a new folder for Extension \#X.
      * Copy the `_MASTER_TEMPLATE` into it.
      * Open Antigravity in a browser.
      * **Prompt Injection:** "Look at `@list.json` ID \#X. Build this extension using `@DESIGN.md` and `@AGENTS.md`. Auto-generate the manifest, background script, and popup."
      * **The Wait:** Wait for the "Plan" to finish, then trigger the "Proceed" button.
      * **Export:** Download the zip or move to the next folder.

### Option B: Internal Orchestration (The "Batch Workflow")

If you want to stay inside Antigravity, you use a **Manager Agent** to handle a batch of 10 extensions at a time (don't do 1,000 at once or the AI will lose context).

1.  **Create `BATCH_LIST.md`**: List 10 problems.
2.  **Workflow File (`.agents/workflows/mass-produce.md`)**:
    ```markdown
    1. Read item from @BATCH_LIST.md.
    2. Scaffold the folder /output/[Extension-Name].
    3. Inject manifest.json with appropriate permissions.
    4. Generate popup.html using @DESIGN.md rules.
    5. Move to next item.
    ```

-----

## 3\. Comparison: Playwright vs. Manual Antigravity

| Feature | Manual Prompting | Playwright Automation |
| :--- | :--- | :--- |
| **Speed** | 30 mins / ext | 5-10 mins / ext |
| **Effort** | High (You type 1,000 times) | Low (Run script & watch) |
| **Consistency** | High (If using `.agents`) | Perfect (Exact replication) |
| **Scaling** | Limited by your stamina | Unlimited (1,000 is easy) |

-----

## 4\. The "Battle-Proof" Execution Guide

### Step 1: The Problem Bank

Generate your 1,000 ideas using Gemini. Save them in a structured format:

```json
{
  "id": "001",
  "name": "FocusTab",
  "problem": "User spends too much time on YouTube.",
  "logic": "Redirect youtube.com to a motivational quote after 10 minutes."
}
```

### Step 2: Build the Orchestrator

I recommend a **Python + Playwright** script. It can "click" the Antigravity buttons for you.

### Step 3: The "Vibe Check" Sampling

You cannot Vibe Check 1,000 extensions. Instead, use **Statistical QA**:

  * Test every **1st, 50th, and 100th** extension manually.
  * If those three are perfect, the 47 in between are likely perfect too because they use the same `DESIGN.md` and `skills/`.

### Step 4: The "Manifest" Guardrail

The biggest risk is the `manifest.json`. Add a rule in your `AGENTS.md`:

> "NEVER use experimental permissions. Only use `storage`, `tabs`, and `activeTab` to ensure 100% Chrome Web Store approval for all 1,000 extensions."

-----

## The Next Step

To make this work, you need the **Python Orchestrator script**. It acts as the "Manager" that talks to Antigravity while you sleep.

Do you want me to write the **Python/Playwright script structure** that will loop through your 1,000 ideas and feed them into Antigravity automatically?

[Mass Production of Chrome Extensions using AI Orchestration](https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DR4SgP7XvW7E)

This video explores how to set up automated pipelines that generate code, assets, and metadata for high-volume extension portfolios.