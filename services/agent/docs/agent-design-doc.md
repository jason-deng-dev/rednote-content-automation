**Project:** automation-ecosystem — MOXI Shopping Agent

**Platform:** running.moximoxi.net — Japanese marathon platform for Chinese runners

**Author:** Jason Deng

**Date:** March 2026

**Status:** Planning — to be built after Rakuten pipeline and Docker deploy are complete

---

## 1. Problem Statement

### 1.1 Context

The running.moximoxi.net store (`/shop/`) sells Japanese running products sourced via the Rakuten pipeline. Customers browsing the store — Chinese runners who may not know Japanese product names or brand conventions — currently have no discovery help. They either know what they want, or they leave.

The Rakuten pipeline already handles product ingestion and WooCommerce push. The gap is the customer-facing layer: helping a customer who knows they need "something for post-marathon recovery" find the right product, even if that product isn't yet in the catalog.

### 1.2 The Problem

- Customers searching for vague terms ("recovery", "energy gel") get poor WooCommerce search results because product names are in Japanese
- Products not yet in the catalog require the customer to give up — there's no way to surface them on demand
- No guided discovery — customers unfamiliar with Japanese running nutrition brands have no help deciding what to buy

### 1.3 Solution

A conversational shopping agent embedded in the WooCommerce site. The agent:

- Engages the customer via a floating chat widget
- Narrows down what they're looking for through conversation
- Queries the PostgreSQL product catalog in the background while chatting
- If a product isn't in the catalog, triggers a live Rakuten fetch — pushing it to WooCommerce before the customer even navigates to the store
- Returns direct WooCommerce product links when ready

The agent is powered by the Claude API using **tool use (function calling)** — Claude decides autonomously which tools to invoke based on the conversation, rather than hardcoded logic.

### 1.4 Goals

- Help customers find products through natural-language conversation
- Surface existing catalog products with direct WooCommerce links
- Proactively fetch missing products from Rakuten before the customer navigates away
- Reduce friction from "I can't find it" → abandoned session

### 1.5 Non-Goals

- Replacing the WooCommerce storefront — agent is a discovery layer only
- Handling cart, checkout, or payments — WooCommerce owns that
- Multilingual conversation — agent operates in Chinese (target audience)
- Recommendation engine with personalisation or purchase history — v1 is stateless per session

---

## 2. Architecture

### 2.1 System Overview

```
┌──────────────────────────────── AWS Lightsail VPS ──────────────────────────────────┐
│                                                                                      │
│  [Rakuten container]           [Agent container]                                     │
│   Express :3002 (internal)      Express :3003                                        │
│   POST /api/request-product  ◄── tool: fetch_from_rakuten()                         │
│   GET  /api/products         ◄── tool: search_products()                            │
│   PostgreSQL                                                                         │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                         │
                       HTTPS
                  POST /api/chat
                         │
                         ▼
        [WordPress — running.moximoxi.net]
         Floating chat widget (vanilla JS)
         Injected via WordPress plugin
         Customer types → agent responds
         Agent returns WooCommerce product links
```

**Key architectural decisions:**

- **Agent is a separate container** — isolated from Rakuten, Dashboard, and Race Hub. Keeps customer-facing chat logic completely separate from the internal pipeline services.
- **Agent calls Rakuten :3002 internally** — over the Docker network. Never exposed to the customer directly.
- **Agent endpoint is public-facing** — proxied via NGINX, reachable from the WordPress-hosted widget.
- **Widget is vanilla JS** — injected via a lightweight WordPress plugin. No React, no build step. Keeps the WordPress footprint minimal.

### 2.2 Container Role

| Container | Role |
|---|---|
| **Agent** | Express :3003. Handles chat sessions, calls Claude API with tool use, executes tools by calling Rakuten :3002 internally. Public-facing via NGINX. |
| **Rakuten** | Existing pipeline container. Agent calls its internal endpoints as tools — no new endpoints needed in Rakuten. |

---

## 3. Claude Tool Use — How It Works

The agent uses the Claude API with **tool use (function calling)**. Rather than hardcoding "if user mentions recovery, search for recovery", Claude decides autonomously which tools to call based on the conversation.

### 3.1 How the Loop Works

```
1. User sends message → POST /api/chat
2. Agent appends message to conversation history
3. Agent calls Claude API with: conversation history + tool definitions
4. Claude responds with either:
   a. A tool call (e.g. search_products({ query: "recovery supplement", category: "recovery" }))
   b. A plain text response (e.g. a follow-up question or final recommendation)
5. If tool call:
   a. Agent executes the tool (calls Rakuten :3002 or queries DB)
   b. Appends tool result to conversation history
   c. Calls Claude API again with updated history
   d. Claude synthesizes a response using the tool result
6. Final response returned to widget
```

This loop can run multiple tool calls in sequence before returning — Claude orchestrates.

### 3.2 Tool Definitions

#### `get_categories()`

Returns the available product categories the store carries.

```json
{
  "name": "get_categories",
  "description": "Returns the list of product categories available in the store. Call this when the customer doesn't know what they're looking for and needs guidance on what the store carries.",
  "input_schema": {
    "type": "object",
    "properties": {}
  }
}
```

**Returns:**
```json
{
  "categories": [
    { "id": "nutrition", "label": "营养补剂", "subcategories": ["运动饮料", "蛋白质", "氨基酸", "维生素", "恢复类"] },
    { "id": "gear", "label": "跑步装备", "subcategories": ["跑鞋", "服装", "GPS手表", "配件"] },
    { "id": "recovery", "label": "恢复护理", "subcategories": ["按摩", "拉伸", "足部护理"] },
    { "id": "training", "label": "训练器材" },
    { "id": "sportswear", "label": "运动服装" }
  ]
}
```

---

#### `search_products({ query, category, limit })`

Searches the PostgreSQL product catalog. Called while the customer is still chatting — results are ready before they ask.

```json
{
  "name": "search_products",
  "description": "Search the product catalog in the database. Use this to find products matching what the customer is looking for. Call this as soon as you have enough information about what they want — don't wait until the end of the conversation.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search term — product name, ingredient, or use case in Japanese or English"
      },
      "category": {
        "type": "string",
        "description": "Optional category filter: nutrition, gear, recovery, training, sportswear"
      },
      "limit": {
        "type": "number",
        "description": "Max results to return. Default 5."
      }
    },
    "required": ["query"]
  }
}
```

**Returns:**
```json
{
  "results": [
    {
      "item_code": "amino-vital-pro-30sticks",
      "name_ja": "アミノバイタル プロ 30本入",
      "category": "nutrition",
      "sale_price": 4980,
      "currency": "CNY",
      "stock_status": "instock",
      "wc_product_url": "https://running.moximoxi.net/product/amino-vital-pro-30sticks/"
    }
  ],
  "total": 1
}
```

---

#### `fetch_from_rakuten({ keyword })`

Triggers the existing Rakuten product request pipeline. Fetches from Rakuten, normalises, prices, and pushes to WooCommerce. Returns the product URL when done.

```json
{
  "name": "fetch_from_rakuten",
  "description": "Fetch a product from Rakuten and add it to the store. Use this ONLY when search_products returns no results. This takes 1-2 minutes — tell the customer you're finding it for them and it will be ready shortly.",
  "input_schema": {
    "type": "object",
    "properties": {
      "keyword": {
        "type": "string",
        "description": "Product name or search term in Japanese or English"
      }
    },
    "required": ["keyword"]
  }
}
```

**Implementation:** calls `POST /api/request-product` on Rakuten :3002 (existing endpoint). Returns WooCommerce product URL on success.

**Returns:**
```json
{
  "status": "success",
  "product_name": "アミノバイタル プロ 30本入",
  "wc_product_url": "https://running.moximoxi.net/product/amino-vital-pro-30sticks/",
  "sale_price": 4980,
  "currency": "CNY"
}
```

---

### 3.3 System Prompt

The system prompt defines the agent's persona, language, and behaviour rules.

```
你是MOXI的购物助手，专为中国跑者服务。MOXI是一个专注于日本马拉松和日本跑步产品的平台。

你的职责：
- 帮助顾客找到合适的日本跑步产品
- 用中文交流（顾客是中国跑者）
- 主动询问顾客的需求，帮助缩小范围
- 在顾客还在聊天时，在后台搜索产品

行为规则：
- 先用search_products搜索现有目录
- 如果没有结果，用fetch_from_rakuten从乐天获取
- 找到产品后，提供直接链接到商品页面
- 不要编造产品信息——只推荐工具返回的真实产品
- 每次对话最多推荐3-5个产品，不要列一长串
- 语气友好、简洁，像一个懂跑步的朋友在帮忙
```

---

## 4. Conversation Flow

### 4.1 Happy Path — Product in Catalog

```
[Widget appears] → "需要帮助找产品吗？" (floating prompt)
  ↓ Customer clicks to open
Agent: "你好！我是MOXI购物助手，帮你找日本跑步产品。你在找什么类型的产品？"
  ↓ Shows category quick-picks: 营养补剂 / 跑步装备 / 恢复护理 / 运动服装
Customer: "我需要马拉松比赛用的能量补给"
  → Claude calls search_products({ query: "energy gel marathon", category: "nutrition" })
  → 3 results found
Agent: "我找到这些适合比赛的能量补给："
  → [氨基酸胶囊 — ¥128] [View]
  → [Amino Vital Pro — ¥156] [View]
  → [Pocari Sweat粉末 — ¥89] [View]
Agent: "你是全程马拉松还是半程？我可以帮你推荐更合适的用量。"
```

### 4.2 Product Not in Catalog — Proactive Rakuten Fetch

```
Customer: "我想要SAVAS的乳清蛋白"
  → Claude calls search_products({ query: "SAVAS whey protein" })
  → 0 results
  → Claude calls fetch_from_rakuten({ keyword: "SAVAS ホエイプロテイン" })
Agent: "我正在从日本乐天为你找SAVAS乳清蛋白，大概需要1-2分钟，稍等一下..."
  [Pipeline runs in background — ~1-2 min]
Agent: "找到了！已经添加到商店："
  → [SAVAS ホエイプロテイン 1kg — ¥398] [View]
```

### 4.3 WooCommerce Navigation

When a product is found, the widget provides a direct link to the WooCommerce product page. Optionally, a "Go to store" button navigates the customer to the WooCommerce search page with their query pre-filled:

```
https://running.moximoxi.net/shop/?s=amino+vital
```

---

## 5. Rate Limiting & Abuse Prevention

Two-layer protection on the agent endpoint:

### 5.1 Per-IP Rate Limit

- **Limit:** 30 requests per 15 minutes per IP
- **Implementation:** `express-rate-limit` middleware
- **On exceed:** 429 response, widget shows "请稍后再试" (please try again later)

### 5.2 Per-Session Message Cap

- **Limit:** 20 messages per session
- **Implementation:** session ID issued as a cookie on first request; message count tracked server-side in memory (Map keyed by session ID)
- **On exceed:** agent responds with a closing message and disables the input field in the widget
- **Session expiry:** 2 hours of inactivity

Both limits are configurable in `.env`.

---

## 6. Frontend Widget

A lightweight vanilla JS + CSS floating chat widget injected into WordPress via a plugin.

### 6.1 Widget States

```
[Collapsed] → floating bubble bottom-right: "💬 需要帮助？"
  ↓ Click
[Expanded — empty] → chat panel opens, agent greeting + category quick-picks
  ↓ Customer types or clicks category
[Active conversation] → chat history, typing indicator while agent responds
  ↓ Agent returns product
[Product result] → product card with name, price, [View] button linking to WooCommerce
```

### 6.2 Tech Stack

- **Vanilla JS + CSS** — no React, no build step. Injected as a single `agent-widget.js` file.
- **WordPress plugin** — `moxi-agent.php` enqueues the widget script on all shop pages
- **Scoped CSS** — widget styles are prefixed to avoid clashing with Flatsome theme

### 6.3 Communication

- `POST /api/chat` — sends `{ message, sessionId }`, receives `{ reply, products[] }`
- No SSE in v1 — polling or simple request/response. Typing indicator shown client-side while awaiting response.
- SSE streaming added in v2 for token-by-token streaming (better UX for longer responses)

---

## 7. Technical Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|---|---|---|---|
| AI layer | Claude tool use (function calling) | Simple Claude prompt, keyword matching, vector search | Tool use is the agent pattern — Claude orchestrates multi-step product discovery autonomously. Most impressive technically and on resume. |
| Conversation model | Multi-turn, server-side history | Stateless per-request | Multi-turn context is required for natural narrowing ("what distance?", "any dietary restrictions?") |
| New service vs embedded | New `services/agent/` container | Add routes to Rakuten or Dashboard | Keeps customer-facing chat isolated from internal pipeline services. Single responsibility. |
| Widget tech | Vanilla JS | React SPA | No build step, minimal WordPress footprint, loads fast on WooCommerce pages |
| Streaming | No SSE in v1 | SSE from the start | Tool use involves multiple API round trips — streaming the final response is a v2 enhancement. Simpler to ship correct first. |
| Rate limiting | Session cap (20 msgs) + IP limit (30 req/15 min) | Auth wall, CAPTCHA | Niche site — not a bot target. Session cap handles normal users, IP limit handles edge cases. No friction for real customers. |
| Language | Chinese only (v1) | Bilingual EN/ZH | Target audience is Chinese runners. EN toggle is a v2 consideration if portfolio demo requires it. |

---

## 8. Implementation Phases

### Phase 1 — Backend Agent Service

1. Initialize `services/agent/` — `package.json`, `.env.example`, Express server
2. Implement `POST /api/chat` — accepts `{ message, sessionId }`, manages conversation history
3. Implement Claude tool use loop — tool definitions, execution, multi-turn handling
4. Implement tool handlers:
   - `get_categories()` — returns static category list from genres.js
   - `search_products()` — queries Rakuten container PostgreSQL via internal API call
   - `fetch_from_rakuten()` — calls `POST /api/request-product` on Rakuten :3002
5. Implement rate limiting — `express-rate-limit` (IP) + session message cap
6. Test end-to-end: product found in catalog, product fetched from Rakuten, category browsing

**Exit criteria:** `POST /api/chat` handles full conversation, tools execute correctly, rate limits fire.

### Phase 2 — WordPress Widget

1. Build `agent-widget.js` — floating bubble, expandable chat panel, message history, typing indicator
2. Product card component — name, price, [View] button with WooCommerce deep link
3. Category quick-picks on open — rendered from `get_categories()` response
4. Session ID management — issued on first message, stored in cookie, sent with each request
5. Build WordPress plugin — `moxi-agent.php` enqueues widget on shop pages, passes API endpoint URL
6. Install plugin on running.moximoxi.net, smoke test on live WooCommerce store

**Exit criteria:** Widget loads on shop pages, conversation works, product links open correct WooCommerce pages.

### Phase 3 — Polish & Deploy

1. Dockerfile for agent container
2. Add agent to `docker-compose.yml` + NGINX config
3. Tune system prompt based on real conversation testing
4. Add SSE streaming for token-by-token responses (v2 UX improvement)
5. Smoke test on Lightsail — full flow: customer types → Claude calls tools → product returned → WooCommerce link works

---

## 9. Repository Structure

```
services/agent/
├── server.js                   # Express entry point
├── routes/
│   └── chat.js                 # POST /api/chat
├── controllers/
│   └── chatController.js       # Request handling, session management, rate limiting
├── services/
│   ├── claudeAgent.js          # Claude API client + tool use loop
│   ├── tools/
│   │   ├── getCategories.js    # Returns category list
│   │   ├── searchProducts.js   # Calls Rakuten :3002 GET /api/products
│   │   └── fetchFromRakuten.js # Calls Rakuten :3002 POST /api/request-product
│   └── sessionStore.js         # In-memory session message count tracker
├── config/
│   └── systemPrompt.js         # Claude system prompt
├── wp-plugin/
│   ├── moxi-agent.php          # WordPress plugin — enqueues widget
│   └── agent-widget.js         # Vanilla JS chat widget
├── docs/
│   ├── agent-design-doc.md
│   └── agent-checklist.md
├── .env.example
├── .gitignore
├── .dockerignore
└── package.json
```

---

## 10. Engineering Challenges

### 10.1 Tool Call Latency

**Challenge:** Claude tool use involves multiple API round trips — the total response time is Claude → tool execution → Claude again. `fetch_from_rakuten` adds another 1-2 minutes on top.

**Solution:** For `search_products`, latency is low (PostgreSQL query). For `fetch_from_rakuten`, the agent tells the customer it's fetching and they should wait — framed as "I'm finding this for you from Japan" which is accurate and sets expectations correctly.

### 10.2 Conversation History Size

**Challenge:** Multi-turn conversation history grows with each message. Sending the full history on every Claude call increases token cost and eventually hits context limits.

**Solution:** Cap conversation history at last 10 turns (20 messages). Older turns are dropped. For a product discovery conversation, the last 10 turns are always sufficient context.

### 10.3 Tool Result Quality

**Challenge:** `search_products` may return results that don't match what the customer actually wants — PostgreSQL full-text search on Japanese product names from a Chinese query is imprecise.

**Solution:** Claude handles result quality filtering — if the returned products clearly don't match, Claude asks a follow-up question rather than surfacing irrelevant results. The system prompt explicitly instructs: "只推荐工具返回的真实产品" (only recommend products the tools actually returned).

---

## 11. Open Questions

- **`search_products` implementation:** Does it call Rakuten :3002 `GET /api/products` or query PostgreSQL directly? Calling the internal API is simpler (no DB credentials in agent container). Direct DB query is faster. Decision pending.
- **EN/ZH toggle:** Widget is Chinese-only in v1. If portfolio demo requires English, add `lang` param to session config.
- **SSE streaming:** v1 is request/response. When to add streaming — Phase 3 or defer entirely?
- **Widget placement:** All shop pages, or only search results page? Start with all shop pages, scope down if it feels intrusive.
