## Agent Service (`services/agent/`)
> Full design doc: `services/agent/docs/agent-design-doc.md`

- [ ] Setup
  - [ ] Initialize `package.json`
  - [ ] Write `.env.example` (Anthropic API key, Rakuten internal URL, session cap, rate limit config)
  - [ ] Write `.dockerignore`
  - [ ] Write `.gitignore`

- [ ] Backend — Express server
  - [ ] `server.js` entry point
  - [ ] `POST /api/chat` route — accepts `{ message, sessionId }`, returns `{ reply, products[] }`
  - [ ] Session store — in-memory Map, tracks message count per session ID, 2hr expiry
  - [ ] Per-session message cap middleware (default: 20 messages)
  - [ ] Per-IP rate limit middleware via `express-rate-limit` (default: 30 req / 15 min)

- [ ] Claude tool use layer (`services/claudeAgent.js`)
  - [ ] Tool definitions — `get_categories`, `search_products`, `fetch_from_rakuten`
  - [ ] Tool use loop — handle tool call responses, execute tool, return result to Claude, get final response
  - [ ] Conversation history management — maintain per-session history, cap at last 10 turns
  - [ ] System prompt loaded from `config/systemPrompt.js`

- [ ] Tool handlers
  - [ ] `getCategories.js` — returns static category list
  - [ ] `searchProducts.js` — calls `GET /api/products` on Rakuten :3002 internally
  - [ ] `fetchFromRakuten.js` — calls `POST /api/request-product` on Rakuten :3002 internally

- [ ] WordPress widget (`wp-plugin/`)
  - [ ] `agent-widget.js` — floating bubble, expandable chat panel, message history, typing indicator
  - [ ] Product card component — name, price, [View] button with WooCommerce deep link
  - [ ] Category quick-picks on open
  - [ ] Session ID cookie management
  - [ ] `moxi-agent.php` — WordPress plugin, enqueues widget on shop pages
  - [ ] Install plugin on running.moximoxi.net + smoke test

- [ ] Deploy
  - [ ] Dockerfile
  - [ ] Add to `docker-compose.yml`
  - [ ] NGINX config — proxy agent :3003 publicly
  - [ ] Smoke test on Lightsail — full conversation flow end-to-end
