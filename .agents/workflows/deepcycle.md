---
description: DeepCycle Extension Replication Workflow
---

# DeepCycle Extension Replication Workflow

## 1. Objective
1.1 Create a fully replicable and reusable extension system  
1.2 Maintain identical structure, branding, and UI across all extensions  
1.3 Allow only extension-specific content to change  
1.4 Enable easy reuse via agents, skill files, and shared components  

---

## 2. Design Consistency Requirements
2.1 Maintain exact consistency with the DeepCycle extension  
2.2 Do NOT modify any of the following:
   - 2.2.1 Branding and color palette  
   - 2.2.2 Typography  
   - 2.2.3 Layout and spacing system  
   - 2.2.4 Overall design system  
   - 2.2.5 UI components:
       - Buttons  
       - Input fields  
       - Selectors  
       - Checkboxes  
       - Toggles  
       - Sections
       - Backgrounds
  

2.3 All new extensions MUST reuse this system without changes  

---

## 3. Global Structure (Header & Footer)
3.1 Use a shared global header across all extensions  
3.2 Use a shared global footer across all extensions  

3.3 Requirements:
   - 3.3.1 Design must remain identical  
   - 3.3.2 Layout must remain identical  
   - 3.3.3 Colors must remain identical  
   - 3.3.4 Structure must remain identical  

3.4 Only allow dynamic updates:
   - 3.4.1 Extension name  
   - 3.4.2 Links  
   - 3.4.3 Content-specific labels  

3.5 Create reusable components:
   - 3.5.1 `header.component`
   - 3.5.2 `footer.component`

3.6 Make them shareable:
   - 3.6.1 Provide copy-paste ready files  
   - 3.6.2 Ensure minimal setup required  
   - 3.6.3 Document clearly how to reuse  

3.7 Define reusable files:
   - 3.7.1 `/components/header.*`
   - 3.7.2 `/components/footer.*`
   - 3.7.3 `/config/links.json`
   - 3.7.4 `/styles/global.css`

---

## 4. Navigation Rules
4.1 If extension has 2+ pages:
   - 4.1.1 Use tab-based navigation  
   - 4.1.2 Follow exact existing tab design  
   - 4.1.3 Do NOT modify tab UI  

4.2 If extension has only 1 page:
   - 4.2.1 Do NOT include tabs  

---

## 5. Designer Agent
5.1 Role:
   - 5.1.1 Ensure pixel-perfect UI replication  
   - 5.1.2 Enforce design system rules  

5.2 Responsibilities:
   - 5.2.1 Apply exact colors and typography  
   - 5.2.2 Maintain spacing and layout  
   - 5.2.3 Reuse UI components only  
   - 5.2.4 Prevent design drift  

5.3 Designer Skill File:
   - 5.3.1 `design-system.skill.md`  
   - 5.3.2 Includes:
       - Color tokens  
       - Typography scale  
       - Component specs  
       - Layout grid rules  

---

## 6. Developer Agent
6.1 Role:
   - 6.1.1 Implement reusable architecture  
   - 6.1.2 Ensure component consistency  

6.2 Responsibilities:
   - 6.2.1 Reuse header/footer components  
   - 6.2.2 Maintain file structure  
   - 6.2.3 Avoid duplicate logic  
   - 6.2.4 Keep components modular  

6.3 Developer Skill File:
   - 6.3.1 `components.skill.md`  
   - 6.3.2 Includes:
       - Header integration steps  
       - Footer integration steps  
       - Dynamic content injection  
       - Link configuration  

---

## 7. Project Structure
7.1 Standard structure for all extensions:
