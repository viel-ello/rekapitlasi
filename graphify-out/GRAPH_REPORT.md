# Graph Report - rekapitlasi  (2026-10-19)

## Corpus Check
- 279 files · ~243,743 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 44 file(s) not represented in the graph (top: .csv 24, .xml 12, (none) 4)

## Summary
- 1148 nodes · 2493 edges · 109 communities (56 shown, 53 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.84)
- Token cost: 23,500 input · 5,600 output

## Community Hubs (Navigation)
- Public Hamlet Detail
- End-to-End Test Setup
- Data Edit Routes
- Data Entry Components
- Admin Column Settings
- Public and Dashboard Routes
- Data API Handlers
- Notifications and Legacy APIs
- Data Entry Pages
- Core Supabase Schema
- Excel Export Builder
- Dashboard Analytics
- Dynamic Column API
- Package Dependencies
- UI UX Search Skill
- AI Chat Route
- AI Chat Interface
- Deprecated Backup Endpoint
- Account and Notifications
- PDF Report Utilities
- Authentication Routes
- Component Configuration
- Package Scripts
- Public Data Views
- Excel Import Confirmation
- Dashboard Shell and Tour
- Shared Card Component
- Column Override API
- Admin Import and Reports
- Public Hamlet Detail
- Word Export Builder
- Dashboard Export Filters
- Design System Engine
- Root Layout Metadata
- Shared UI Primitives
- Hamlet Name Matching
- Request Validation
- Test Dependencies
- NPM Scripts
- BM25 Search Engine
- Nested Table Utilities
- UI UX Search Toolkit
- Admin User Management
- Internal Hamlet Detail
- Excel Import Handling
- Period Notifications
- Keyboard Shortcuts
- UI UX Search Core
- Excel Templates
- E2E Configuration
- Design Output Formatter
- Security Audit Report
- Hamlet Data Cache
- Public Welcome Page
- Accordion Component
- Postgres Catalog Migration
- Hamlet Migration Plan
- Monthly Data and AI
- Playwright MCP Config
- JWT Route Proxy
- Unique Reporting Periods
- Jest Configuration
- JS Path Aliases
- Security Phase Report
- Active Report Years
- UI Testing Roadmap
- Period Uniqueness Review
- Excel Import Recovery
- Baturetno Map Assets
- PKK Branding Assets
- Tableau Dashboard Design
- Accessible Dialog
- UX Testing Plan
- Component Modularization
- Public Portal Narrative
- Dashboard Visual Style
- Dynamic Table Schema
- Hamlet Migration Schema
- PKK Design System
- UI UX Guidance
- Pokja I Hamlet Report
- PKK Work Program Template
- Security and Data Integrity
- Supabase Migration Sequence
- Dark Mode Gaps

## God Nodes (most connected - your core abstractions)
1. `next` - 61 edges
2. `react` - 49 edges
3. `requireAuth()` - 44 edges
4. `supabase` - 38 edges
5. `flowbite-react-icons` - 36 edges
6. `NestedDataPage()` - 34 edges
7. `writeLog()` - 31 edges
8. `requireAdmin()` - 31 edges
9. `DataStatsPage()` - 29 edges
10. `cn()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Report Period Uniqueness Issue` --semantically_similar_to--> `Report Period Uniqueness Migration`  [INFERRED] [semantically similar]
  REVIEW_TEMUAN_DAN_PROMPT_CLAUDE_2026-06-17.md → docs/DEPLOYMENT.md
- `GET()` --calls--> `requireAuth()`  [EXTRACTED]
  app/api/admin/column-overrides/route.js → lib/auth.js
- `GET()` --calls--> `requireAuth()`  [EXTRACTED]
  app/api/admin/columns/route.js → lib/auth.js
- `GET()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/users/route.js → lib/auth.js
- `fetchStats()` --calls--> `getDusunCached()`  [EXTRACTED]
  components/DataStatsPage.js → lib/fetchDusun.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Hamlet Migration Requirements, Design, and Tasks** — agents_v5_migration_scope, kiro_specs_migrasi_level_desa_design_migration_architecture, kiro_specs_migrasi_level_desa_requirements_hamlet_data_scope, kiro_specs_migrasi_level_desa_tasks_migration_phases [EXTRACTED 1.00]

## Communities (109 total, 53 thin omitted)

### Community 0 - "Public Hamlet Detail"
Cohesion: 0.07
Nodes (51): clampMonth(), clampYear(), dynamic, GET(), ALLOWED_TABLES_FOR_COMPLETENESS, clampMonth(), clampYear(), dynamic (+43 more)

### Community 1 - "End-to-End Test Setup"
Cohesion: 0.06
Nodes (41): STORAGE_STATE, ARTIFACT_DIR, catalogForms(), checkBlankPage(), checkOverflow(), checkTapTargets(), collectErrors(), extractLinks() (+33 more)

### Community 2 - "Data Edit Routes"
Cohesion: 0.08
Nodes (22): BumilEditPage(), DataUmumEditPage(), Pokja1EditPage(), Pokja2EditPage(), Pokja3EditPage(), Pokja4EditPage(), RekapDawisEditPage(), DataEditPage() (+14 more)

### Community 3 - "Data Entry Components"
Cohesion: 0.18
Nodes (26): AutoGrowTextarea(), BUMIL_COLUMN_GROUPS, BumilDataPage(), flattenBumilGroups(), resolveBumilGroups(), DataPageIcon(), ICONS, DensityToggle() (+18 more)

### Community 4 - "Admin Column Settings"
Cohesion: 0.13
Nodes (23): ColumnsTab(), DynamicColumnsPanel(), StandardColumnsPanel(), Field(), MONTH_NAMES, ROLE_LABELS, ROLES, DesaTab() (+15 more)

### Community 5 - "Public and Dashboard Routes"
Cohesion: 0.06
Nodes (14): nextConfig, securityHeaders, env, fs, keyMatch, fs, path, fs (+6 more)

### Community 6 - "Data API Handlers"
Cohesion: 0.09
Nodes (23): GET, POST, GET, POST, GET, POST, GET, POST (+15 more)

### Community 7 - "Notifications and Legacy APIs"
Cohesion: 0.09
Nodes (17): GET(), POST(), GET(), dynamic, GET(), TABLE_LABELS, ACTION_TO_STATUS, canPerformAction() (+9 more)

### Community 8 - "Data Entry Pages"
Cohesion: 0.16
Nodes (16): BumilPage(), DataUmumPage(), Pokja1Page(), Pokja2Page(), Pokja3Page(), Pokja4Page(), RekapDawisPage(), AnimatedBar() (+8 more)

### Community 9 - "Core Supabase Schema"
Cohesion: 0.13
Nodes (24): audit_logs, data_bumil, data_kegiatan_warga, data_pokja1, data_pokja2, data_pokja3, data_pokja4, data_rekap_dawis (+16 more)

### Community 10 - "Excel Export Builder"
Cohesion: 0.19
Nodes (22): applyBoldRows(), applyBorderRange(), BORDER_THIN, buildBumilSheet(), buildDataUmumSheet(), buildPokja1Sheet(), buildPokja2Sheet(), buildPokja3Sheet() (+14 more)

### Community 11 - "Dashboard Analytics"
Cohesion: 0.19
Nodes (19): DashboardPage(), DesaCompareSelector(), getStatusDotClass(), getStatusLabel(), HorizontalStatBar(), MiniTrendCard(), MONTHS, TABLE_FILTERS (+11 more)

### Community 12 - "Dynamic Column API"
Cohesion: 0.13
Nodes (16): DELETE(), GET(), POST(), VALID_COLUMN_TYPES, GET(), GET(), bcrypt, getAuthUser() (+8 more)

### Community 13 - "Package Dependencies"
Cohesion: 0.09
Nodes (23): dependencies, bcryptjs, class-variance-authority, clsx, docx, exceljs, flowbite, flowbite-react (+15 more)

### Community 14 - "UI UX Search Skill"
Cohesion: 0.13
Nodes (3): detect_domain(), search(), DesignSystemGenerator

### Community 15 - "AI Chat Route"
Cohesion: 0.13
Nodes (16): buildSystemPrompt(), dynamic, genAI, getDbContext(), POST(), ROLE_LABELS, TABLE_LABELS, TABLES_WITH_MONTH (+8 more)

### Community 16 - "AI Chat Interface"
Cohesion: 0.17
Nodes (13): ChatFab(), ChatHeader(), ChatInput(), ChatMessageList(), renderContent(), ImportPreviewModal(), MutationPreviewCard(), AiChatBubble() (+5 more)

### Community 17 - "Deprecated Backup Endpoint"
Cohesion: 0.18
Nodes (14): BACKUP_GUIDE, deprecated(), GET(), POST(), GET(), PUT(), GET(), PUT() (+6 more)

### Community 18 - "Account and Notifications"
Cohesion: 0.17
Nodes (11): NotificationsPage(), TYPE_LABEL, ACTION_LABEL, ProfilePage(), ROLE_LABELS, EmptyState(), ThemeBtn(), Topbar() (+3 more)

### Community 19 - "PDF Report Utilities"
Cohesion: 0.14
Nodes (17): a11y, body(), BOTTOM(), bullet(), crawl, discovery, doc, h1() (+9 more)

### Community 20 - "Authentication Routes"
Cohesion: 0.27
Nodes (11): POST(), POST(), authenticateUser(), createToken(), hashPassword(), verifyPassword(), checkRateLimit(), clearAttempts() (+3 more)

### Community 21 - "Component Configuration"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 22 - "Package Scripts"
Cohesion: 0.11
Nodes (17): name, private, version, autoprefixer, babel-jest, @babel/preset-env, bcryptjs, flowbite (+9 more)

### Community 23 - "Public Data Views"
Cohesion: 0.13
Nodes (10): idx_data_bumil_tahun, idx_data_bumil_tahun_bulan, idx_data_pokja1_tahun, idx_data_pokja2_tahun, idx_data_pokja3_tahun, idx_data_pokja4_tahun, idx_data_rekap_dawis_tahun, idx_data_rekap_dawis_tahun_bulan (+2 more)

### Community 24 - "Excel Import Confirmation"
Cohesion: 0.31
Nodes (12): POST(), POST(), POST(), buildImportDiff(), hasChanged(), normalizeName(), sanitizeIncomingFields(), sheetsFromDiff() (+4 more)

### Community 25 - "Dashboard Shell and Tour"
Cohesion: 0.21
Nodes (13): DashboardLayout(), computeTooltipPosition(), OnboardingTour(), STEPS, Sidebar(), CLASS_BY_TYPE, ICON_BY_TYPE, ICON_COLOR_BY_TYPE (+5 more)

### Community 26 - "Shared Card Component"
Cohesion: 0.22
Nodes (15): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Table, TableBody (+7 more)

### Community 27 - "Column Override API"
Cohesion: 0.23
Nodes (12): DELETE(), GET(), POST(), VALID_KEYS_PER_TABLE, VALID_TABLES, DELETE(), PATCH(), POST() (+4 more)

### Community 28 - "Admin Import and Reports"
Cohesion: 0.23
Nodes (12): ImportPreviewModal(), ImportTab(), Field(), MONTHS, ReportsPage(), Step1Tables(), Step2Period(), Step3DesaCols() (+4 more)

### Community 29 - "Public Hamlet Detail"
Cohesion: 0.19
Nodes (13): COLUMN_LABEL, fmt(), MONTHS, PublikDusunDetail(), STATUS_LABEL, TABLE_LABEL, TrendCard(), MONTHS (+5 more)

### Community 30 - "Word Export Builder"
Cohesion: 0.17
Nodes (14): ALL_EXPORT_SECTIONS, BORDERS, buildPokjaSection, buildTableSection(), BUMIL_DEF, DATA_UMUM_DEF, dataCell(), dynamic (+6 more)

### Community 31 - "Dashboard Export Filters"
Cohesion: 0.21
Nodes (10): DashboardToolbar(), SelectField(), Spinner(), TEMPLATES, adminItems, menuItems, Dialog(), FOCUSABLE (+2 more)

### Community 32 - "Design System Engine"
Cohesion: 0.19
Nodes (5): _detect_page_type(), format_master_md(), format_page_override_md(), _generate_intelligent_overrides(), persist_design_system()

### Community 33 - "Root Layout Metadata"
Cohesion: 0.21
Nodes (10): firaCode, lora, metadata, plusJakartaSans, RootLayout(), ThemeProvider(), applyThemeClass(), resolveSystemTheme() (+2 more)

### Community 34 - "Shared UI Primitives"
Cohesion: 0.19
Nodes (9): Badge(), badgeVariants, Button, buttonVariants, Input, class-variance-authority, clsx, @radix-ui/react-slot (+1 more)

### Community 35 - "Hamlet Name Matching"
Cohesion: 0.23
Nodes (9): levenshtein(), matchDesa, matchDusun(), normalize(), parseExcel(), REKAP_DAWIS_KEYS, REKAP_DAWIS_SHEET, ROLE_TABLE_MAP (+1 more)

### Community 36 - "Request Validation"
Cohesion: 0.19
Nodes (11): DATA_PAGE_LIST, getDynamicColumnMap(), getTableColumnKeys(), isPlainObject(), MAX_YEAR, MIN_YEAR, sanitizeDataWritePayload(), TABLE_COLUMN_TYPES (+3 more)

### Community 37 - "Test Dependencies"
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer, @axe-core/playwright, babel-jest, @babel/preset-env, dotenv, jest, jest-environment-jsdom (+5 more)

### Community 38 - "NPM Scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, e2e, e2e:report, e2e:show, e2e:smoke, start (+4 more)

### Community 40 - "Nested Table Utilities"
Cohesion: 0.25
Nodes (8): annotate(), walk(), buildHeaderRows(), visit(), flattenLeaves(), resolveTree(), { resolveTree, annotate, flattenLeaves, buildHeaderRows }, tree

### Community 42 - "Admin User Management"
Cohesion: 0.40
Nodes (9): DELETE(), GET(), getAdminCount(), POST(), PUT(), resolveDusunIdForRole(), validateFullName(), validatePassword() (+1 more)

### Community 43 - "Internal Hamlet Detail"
Cohesion: 0.31
Nodes (9): getColumnsForTable(), InternalDusunDetail(), MiniTrend(), MONTHS, PerTablePanel(), Ringkasan(), STATUS_BADGE, TAB_TABLES (+1 more)

### Community 44 - "Excel Import Handling"
Cohesion: 0.24
Nodes (5): importToSupabase(), capturedUpserts, DUSUN_LIST, capturedUpserts, DUSUN_LIST

### Community 45 - "Period Notifications"
Cohesion: 0.31
Nodes (8): createPeriodNotifications(), insertNotifications(), PERIOD_LABEL, periodLabel(), { supabase }, tableSlug(), from(), makeQuery()

### Community 46 - "Keyboard Shortcuts"
Cohesion: 0.33
Nodes (7): eventMatches(), __internal, isEditableTarget(), MODIFIER_ALIASES, normalizeShortcut(), useKeyboardShortcut(), { __internal }

### Community 48 - "Excel Templates"
Cohesion: 0.33
Nodes (8): handleFileUpload(), dynamic, GET(), sheetNameForTable(), TABLE_COLUMNS, TABLE_LABELS, normalizeTableName(), exceljs

### Community 49 - "E2E Configuration"
Cohesion: 0.25
Nodes (5): confirmed, supabase, TABLES, dotenv, @supabase/supabase-js

### Community 50 - "Design Output Formatter"
Cohesion: 0.29
Nodes (3): format_ascii_box(), format_markdown(), generate_design_system()

### Community 51 - "Security Audit Report"
Cohesion: 0.29
Nodes (7): Audit Report 12 October 2026, Excel Formula Injection, Production Target E2E Risk, Public Portal Server Side Rendering, Operational Reset SQL Risk, Supabase RLS Security Risk, Unsaved Input Loss Risk

### Community 52 - "Hamlet Data Cache"
Cohesion: 0.53
Nodes (4): GET(), fetchFromDb(), getActiveDusun(), { supabase }

### Community 53 - "Public Welcome Page"
Cohesion: 0.53
Nodes (4): FEATURES, KpiTile(), WelcomePage(), MapWonogiri3D()

### Community 54 - "Accordion Component"
Cohesion: 0.33
Nodes (4): AccordionContent, AccordionItem, AccordionTrigger, @radix-ui/react-accordion

### Community 56 - "Hamlet Migration Plan"
Cohesion: 0.40
Nodes (5): Village to Hamlet Scope Migration, Public Aggregate Portal, Hamlet Migration Architecture, Data Scope per Hamlet, Migration Implementation Phases

### Community 57 - "Monthly Data and AI"
Cohesion: 0.40
Nodes (5): AI Mutation Dry Run, Monthly Data Umum, Laporan Pekerjaan 12 Juni 2026, Month Aware Excel Import, Phase 2 Import and Performance Report

### Community 58 - "Playwright MCP Config"
Cohesion: 0.50
Nodes (3): npx, playwright, @playwright/mcp

### Community 63 - "Security Phase Report"
Cohesion: 0.67
Nodes (3): Phase 1 Security and Data Integrity Report, Report Period Uniqueness, Supabase Anon Client Fail Fast

## Knowledge Gaps
- **57 isolated node(s):** `npx`, `@playwright/mcp`, `@tanstack/react-table`, `flowbite`, `flowbite-react` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 445 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Notifications and Legacy APIs` to `Public Hamlet Detail`, `Data Entry Components`, `Admin Column Settings`, `Public and Dashboard Routes`, `Data API Handlers`, `Data Entry Pages`, `Excel Export Builder`, `Dashboard Analytics`, `Dynamic Column API`, `AI Chat Route`, `Deprecated Backup Endpoint`, `Account and Notifications`, `Authentication Routes`, `Package Scripts`, `Excel Import Confirmation`, `Dashboard Shell and Tour`, `Column Override API`, `Public Hamlet Detail`, `Word Export Builder`, `Dashboard Export Filters`, `Root Layout Metadata`, `Admin User Management`, `Internal Hamlet Detail`, `Excel Templates`, `Hamlet Data Cache`, `Public Welcome Page`, `JWT Route Proxy`?**
  _High betweenness centrality (0.263) - this node is a cross-community bridge._
- **What connects `npx`, `@playwright/mcp`, `@tanstack/react-table` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Public Hamlet Detail` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Admin Column Settings` to `Root Layout Metadata`, `Shared UI Primitives`, `Data Entry Components`, `Data Entry Pages`, `Dashboard Analytics`, `Internal Hamlet Detail`, `Keyboard Shortcuts`, `AI Chat Interface`, `Account and Notifications`, `Public Welcome Page`, `Accordion Component`, `Package Scripts`, `Dashboard Shell and Tour`, `Shared Card Component`, `Admin Import and Reports`, `Public Hamlet Detail`, `Dashboard Export Filters`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `End-to-End Test Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.05817028027498678 - nodes in this community are weakly interconnected._
- **Why does `flowbite-react-icons` connect `Admin Column Settings` to `Data Entry Components`, `Data Entry Pages`, `Dashboard Analytics`, `Internal Hamlet Detail`, `Account and Notifications`, `Public Welcome Page`, `Package Scripts`, `Dashboard Shell and Tour`, `Admin Import and Reports`, `Public Hamlet Detail`, `Dashboard Export Filters`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `Data Edit Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08205128205128205 - nodes in this community are weakly interconnected._