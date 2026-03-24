# NeuroStudy: Strategic Roadmap & Decision Framework

As a Technical Product Strategist, I have analyzed the current project state (MVP) and the path toward a production-grade AI-driven application. This document outlines the rationale, prioritization, and technical trade-offs for the team's next steps.

---

## 1. Capability Gaps Analysis
The project currently suffers from "forgetfulness." The immediate gaps to address are:
- **Persistence:** Currently, study data resets every time the server restarts. This is the #1 friction point for any study tool. Without persistence, the AI cannot track progress over time.
- **Identity:** Users cannot differentiate their data or synchronize it across devices. This limits the app's utility to a single machine's local instance.
- **Insights Quality:** Rule-based heuristics are great for an MVP, but they don't learn from real-world outcomes (e.g., "Did my focus rating at 10 AM actually correlate with better exam scores?").

---

## 2. Prioritization & Dependencies Framework

### **Strategy: Persistence BEFORE Authentication**
- **Why?** Persistence is the foundation of user value. Authentication is the mechanism for *delivering* that value across users. You can have a persistent single-user experience immediately (Quick Win), but authentication without persistence is technically useless.
- **Dependency:** Database schema design must be "multi-tenant ready" from the start to avoid a major refactor once auth is added.

---

## 3. Effort vs. Impact Breakdown

| Feature | Effort | User Impact | Business Impact | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Local Persistence (SQLite)** | **Low** | **High** (History) | **Med** (Retention) | **PHASE 1 (Implemented)** |
| **User Authentication (JWT)** | **Med** | **Med** (Sync) | **High** (Privacy) | **PHASE 2** |
| **Cloud Database (PostgreSQL)** | **Med** | **Low** (Implicit) | **High** (Scale) | **PHASE 2** |
| **ML-based Predictive Models** | **High**| **High** (Results) | **High** (Competition) | **PHASE 3** |

---

## 4. Architectural Implications

### Transitions for Phase 1 & 2:
- **API Model Layer:** We shifted from in-memory lists to a persistent database (SQLite). This required adding a `get_db()` context manager and refactoring all GET and POST endpoints.
- **Data Freshness:** The frontend now needs to fetch the entire history on startup. We must optimize the `/sessions` call to handle thousands of records as users grow.
- **Auth Layer:** Adding auth will require a `User` table and foreign key relationships across almost every endpoint.

---

## 5. Alternative & Unconventional Paths

### Adjacent Opportunities:
- **Mobile PWA (Progressive Web App):** Since we are using Vanilla JS and CSS, a PWA wrapper would allow users to log sessions directly from their phone with minimal effort.
- **Neuro-Interface Integration:** Future exploration could include integrating simple EEG data via Bluetooth to automate "Focus Level" tracking instead of relying on manual input.
- **Export to Notion/LMS:** High-performing students often use multiple tools. Allowing users to sync their NeuroStudy Roadmap to Google Calendar or Notion would create deep "sticky" value.

---

## 6. Integration Complexity Assessment
- **Smooth Addition:** Database persistence (SQLite) is additive. It requires minimal changes to the frontend logic and keeps the current API structure intact.
- **Refactor Alert:** Authentication will force a significant refactoring of the backend endpoints to include `user_id` filters. It's better to implement this sooner rather than later to avoid large migrations.

---

**Next Immediate Action:** The database persistence layer has been implemented using SQLite to bridge the most critical capability gap. Team should now focus on Phase 2: User Identity.
