import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  BookOpen,
  Boxes,
  BrainCircuit,
  CalendarDays,
  Code2,
  Database,
  ExternalLink,
  FlaskConical,
  Heart,
  Languages,
  Library,
  Link2,
  ListFilter,
  Menu,
  MessageCircle,
  MessageSquareText,
  PanelRight,
  Quote as QuoteIcon,
  Repeat2,
  RotateCcw,
  Search,
  Server,
  Sparkles,
  SquareTerminal,
  Tags,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

type LinkItem = { url: string; label: string };
type Bookmark = {
  id: string;
  url: string;
  author: string;
  handle: string;
  text: string;
  quoteText?: string;
  articleTitle?: string;
  articlePreview?: string;
  createdAt: string;
  year: number;
  shelf: string;
  topics: string[];
  formats: string[];
  domains: string[];
  links: LinkItem[];
  language: string;
  media: string[];
  stats: { likes: number; reposts: number; replies: number; bookmarks: number };
  quality: number;
  flags: string[];
};

type LibraryPayload = {
  meta: {
    sourceCount: number;
    includedCount: number;
    excludedCount: number;
    generatedAt: string;
    shelves: { name: string; description: string }[];
    counts: {
      shelves: Record<string, number>;
      topics: Record<string, number>;
      formats: Record<string, number>;
      years: Record<string, number>;
    };
  };
  records: Bookmark[];
};

type IndexedBookmark = Bookmark & { searchText: string; titleText: string };
type SortMode = "recommended" | "relevance" | "newest" | "oldest" | "popular";
type QuickView = "all" | "genai" | "tools" | "architecture" | "comments" | "research";

const PAGE_SIZE = 40;

const quickViews: { id: QuickView; label: string; short: string }[] = [
  { id: "all", label: "All bookmarks", short: "All" },
  { id: "genai", label: "Generative AI", short: "AI" },
  { id: "tools", label: "Tools & repositories", short: "Tools" },
  { id: "architecture", label: "Architecture", short: "Arch" },
  { id: "comments", label: "Useful comments", short: "Replies" },
  { id: "research", label: "Papers & research", short: "Papers" },
];

const shelfCodes: Record<string, string> = {
  "AI & Intelligence": "AI",
  "Software Craft": "SW",
  "Systems & Infrastructure": "SYS",
  "Data & Machine Learning": "DATA",
  "Science & Mathematics": "SCI",
};

const quickViewIcons: Record<QuickView, LucideIcon> = {
  all: Library,
  genai: Sparkles,
  tools: Wrench,
  architecture: Boxes,
  comments: MessageSquareText,
  research: FlaskConical,
};

const shelfIcons: Record<string, LucideIcon> = {
  "AI & Intelligence": BrainCircuit,
  "Software Craft": Code2,
  "Systems & Infrastructure": Server,
  "Data & Machine Learning": Database,
  "Science & Mathematics": FlaskConical,
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function friendlyDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function cleanTitle(text: string) {
  const clean = text.replace(/https?:\/\/\S+/g, "").replace(/^@\w+\s*/, "").trim();
  if (!clean) return "Saved technical note";
  const first = clean.split(/\n|(?<=[.!?])\s+/)[0].trim();
  return first.length > 180 ? `${first.slice(0, 177).trim()}…` : first;
}

function getTitle(record: Bookmark) {
  return record.articleTitle || cleanTitle(record.text || record.quoteText || "");
}

function getPreview(record: Bookmark) {
  const text = record.articleTitle ? record.articlePreview || record.text : record.text;
  return text.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

function parseSearch(query: string) {
  const parts = query.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const fields: Record<string, string[]> = {};
  const terms: string[] = [];
  for (const rawPart of parts) {
    const part = rawPart.replace(/^"|"$/g, "");
    const match = part.match(/^(author|topic|shelf|type|format|domain|year):(.+)$/i);
    if (!match) {
      terms.push(part.toLowerCase());
      continue;
    }
    const field = match[1].toLowerCase() === "format" ? "type" : match[1].toLowerCase();
    const value = match[2].replace(/^"|"$/g, "").toLowerCase();
    fields[field] = [...(fields[field] ?? []), value];
  }
  return { terms, fields };
}

function fieldMatches(record: IndexedBookmark, fields: Record<string, string[]>) {
  const values: Record<string, string> = {
    author: `${record.author} ${record.handle}`.toLowerCase(),
    topic: record.topics.join(" ").toLowerCase(),
    shelf: record.shelf.toLowerCase(),
    type: record.formats.join(" ").toLowerCase(),
    domain: record.domains.join(" ").toLowerCase(),
    year: String(record.year),
  };
  return Object.entries(fields).every(([field, needles]) => needles.every((needle) => values[field]?.includes(needle)));
}

function scoreSearch(record: IndexedBookmark, terms: string[]) {
  if (!terms.length) return record.quality;
  let score = 0;
  const topicText = `${record.shelf} ${record.topics.join(" ")} ${record.formats.join(" ")}`.toLowerCase();
  const authorText = `${record.author} ${record.handle} ${record.domains.join(" ")}`.toLowerCase();
  const bodyText = `${record.text} ${record.quoteText ?? ""} ${record.articlePreview ?? ""}`.toLowerCase();
  for (const term of terms) {
    if (!record.searchText.includes(term)) return -1;
    if (record.titleText.includes(term)) score += 12;
    if (topicText.includes(term)) score += 9;
    if (authorText.includes(term)) score += 7;
    if (bodyText.includes(term)) score += 3;
  }
  return score + record.quality * 0.25;
}

function renderHighlighted(text: string, terms: string[]) {
  const safeTerms = terms.filter((term) => term.length > 1).slice(0, 8);
  if (!safeTerms.length) return text;
  const pattern = new RegExp(`(${safeTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(pattern).map((part, index) =>
    safeTerms.some((term) => part.toLowerCase() === term.toLowerCase())
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : <Fragment key={`${part}-${index}`}>{part}</Fragment>,
  );
}

function matchesQuickView(record: Bookmark, view: QuickView) {
  if (view === "all") return true;
  if (view === "genai") return record.shelf === "AI & Intelligence";
  if (view === "tools") return record.formats.some((item) => item === "Tool" || item === "Code");
  if (view === "architecture") return record.topics.some((item) => item === "Architecture & APIs" || item === "Distributed Systems");
  if (view === "comments") return record.flags.includes("Useful comment");
  return record.formats.includes("Paper");
}

function DetailPanel({ record, onClose }: { record: Bookmark; onClose: () => void }) {
  const body = record.articleTitle ? record.articlePreview || record.text : record.text;
  return (
    <aside className="detail-panel" aria-label="Bookmark details">
      <div className="detail-header">
        <span><PanelRight size={15} />Bookmark details</span>
        <button type="button" onClick={onClose} aria-label="Close details"><X size={15} /></button>
      </div>
      <div className="detail-scroll">
        <div className="detail-breadcrumb"><Tags size={13} /><span>{shelfCodes[record.shelf]}</span>{record.shelf} / {record.topics[0]}</div>
        <h2>{getTitle(record)}</h2>
        <div className="detail-author">
          <span className="avatar">{record.author.slice(0, 1).toUpperCase()}</span>
          <div><strong>{record.author}</strong><small>@{record.handle} · {friendlyDate(record.createdAt)}</small></div>
        </div>
        {body && !/^https?:\/\/x\.com\/i\/article/i.test(body) && <p className="detail-copy">{body}</p>}
        {record.quoteText && <blockquote><small><QuoteIcon size={12} />Quoted context</small>{record.quoteText}</blockquote>}

        <section className="detail-section">
          <h3><Tags size={13} />Classification</h3>
          <div className="chips">{record.topics.map((item) => <span key={item}>{item}</span>)}{record.formats.map((item) => <span key={item}>{item}</span>)}</div>
        </section>

        <section className="detail-section">
          <h3><Database size={13} />Source metadata</h3>
          <dl>
            <div><dt><CalendarDays size={13} />Year</dt><dd>{record.year}</dd></div>
            <div><dt><Languages size={13} />Language</dt><dd>{record.language.toUpperCase()}</dd></div>
            <div><dt><Heart size={13} />Likes</dt><dd>{record.stats.likes.toLocaleString()}</dd></div>
            <div><dt><Repeat2 size={13} />Reposts</dt><dd>{record.stats.reposts.toLocaleString()}</dd></div>
            <div><dt><MessageCircle size={13} />Replies</dt><dd>{record.stats.replies.toLocaleString()}</dd></div>
          </dl>
        </section>

        {record.links.length > 0 && <section className="detail-section"><h3><Link2 size={13} />Linked resources</h3><div className="detail-links">{record.links.map((link) => <a href={link.url} target="_blank" rel="noreferrer" key={link.url}>{link.label}<ExternalLink size={13} /></a>)}</div></section>}
      </div>
      <div className="detail-actions"><a href={record.url} target="_blank" rel="noreferrer">Open original <ExternalLink size={15} /></a></div>
    </aside>
  );
}

export function BookmarkLibrary() {
  const [payload, setPayload] = useState<LibraryPayload | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [shelf, setShelf] = useState("All shelves");
  const [topic, setTopic] = useState("All topics");
  const [format, setFormat] = useState("All formats");
  const [year, setYear] = useState("All years");
  const [quickView, setQuickView] = useState<QuickView>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    const bundledPayload = (window as Window & { __FIELD_NOTES_DATA__?: LibraryPayload }).__FIELD_NOTES_DATA__;
    if (bundledPayload) {
      setPayload(bundledPayload);
      return;
    }

    fetch(`${import.meta.env.BASE_URL}data/bookmarks.json`)
      .then((response) => {
        if (!response.ok) throw new Error("The bookmark index could not be loaded.");
        return response.json() as Promise<LibraryPayload>;
      })
      .then(setPayload)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "SELECT") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (document.activeElement === inputRef.current && query) setQuery("");
        else setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query]);

  useEffect(() => setVisible(PAGE_SIZE), [deferredQuery, shelf, topic, format, year, quickView, sort]);

  const indexed = useMemo<IndexedBookmark[]>(() => (payload?.records ?? []).map((record) => {
    const titleText = getTitle(record).toLowerCase();
    return {
      ...record,
      titleText,
      searchText: [titleText, record.text, record.quoteText, record.articlePreview, record.author, record.handle, record.shelf, ...record.topics, ...record.formats, ...record.domains, record.year]
        .filter(Boolean).join(" ").toLowerCase(),
    };
  }), [payload]);

  const parsed = useMemo(() => parseSearch(deferredQuery), [deferredQuery]);
  const topics = useMemo(() => {
    if (!payload) return [];
    const counts = new Map<string, number>();
    for (const record of payload.records) {
      if (shelf !== "All shelves" && record.shelf !== shelf) continue;
      for (const item of record.topics) counts.set(item, (counts.get(item) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [payload, shelf]);

  const filtered = useMemo(() => {
    const matches = indexed.flatMap((record) => {
      if (shelf !== "All shelves" && record.shelf !== shelf) return [];
      if (topic !== "All topics" && !record.topics.includes(topic)) return [];
      if (format !== "All formats" && !record.formats.includes(format)) return [];
      if (year !== "All years" && String(record.year) !== year) return [];
      if (!matchesQuickView(record, quickView) || !fieldMatches(record, parsed.fields)) return [];
      const searchScore = scoreSearch(record, parsed.terms);
      return searchScore < 0 ? [] : [{ record, searchScore }];
    });
    const effectiveSort = deferredQuery && sort === "recommended" ? "relevance" : sort;
    matches.sort((a, b) => {
      if (effectiveSort === "relevance") return b.searchScore - a.searchScore;
      if (effectiveSort === "newest") return b.record.createdAt.localeCompare(a.record.createdAt);
      if (effectiveSort === "oldest") return a.record.createdAt.localeCompare(b.record.createdAt);
      if (effectiveSort === "popular") return (b.record.stats.likes + b.record.stats.reposts * 2) - (a.record.stats.likes + a.record.stats.reposts * 2);
      return b.record.quality - a.record.quality;
    });
    return matches.map((item) => item.record);
  }, [indexed, shelf, topic, format, year, quickView, parsed, deferredQuery, sort]);

  const selected = selectedId ? payload?.records.find((record) => record.id === selectedId) ?? null : null;
  const years = Object.entries(payload?.meta.counts.years ?? {}).sort((a, b) => Number(b[0]) - Number(a[0]));
  const activeFilters = [shelf !== "All shelves", topic !== "All topics", format !== "All formats", year !== "All years", quickView !== "all", Boolean(query)].filter(Boolean).length;

  const resetFilters = () => {
    setQuery(""); setShelf("All shelves"); setTopic("All topics"); setFormat("All formats"); setYear("All years"); setQuickView("all"); setSort("newest");
  };

  const chooseQuickView = (view: QuickView) => {
    setQuickView(view); setShelf("All shelves"); setTopic("All topics"); setSidebarOpen(false);
  };

  const chooseShelf = (name: string) => {
    setShelf(name); setTopic("All topics"); setQuickView("all"); setSidebarOpen(false);
  };

  if (error) return <main className="status-screen"><div className="status-logo">FN</div><h1>Index unavailable</h1><p>{error}</p></main>;
  if (!payload) return <main className="status-screen"><div className="status-logo">FN</div><p>Loading bookmark index…</p><div className="progress"><span /></div></main>;

  const toolCount = payload.records.filter((record) => record.formats.some((item) => item === "Tool" || item === "Code")).length;
  const commentCount = payload.records.filter((record) => record.flags.includes("Useful comment")).length;

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand"><span><BookOpen size={17} /></span><div><strong>Field Notes</strong><small>Personal research index</small></div></div>
        <nav>
          <section>
            <h2>Library</h2>
            {quickViews.map((view) => {
              const Icon = quickViewIcons[view.id];
              return <button className={quickView === view.id && shelf === "All shelves" ? "nav-item active" : "nav-item"} key={view.id} onClick={() => chooseQuickView(view.id)}>
                <span className="nav-symbol"><Icon size={14} strokeWidth={1.8} /></span><span>{view.label}</span>
                {view.id === "all" && <b>{payload.meta.includedCount.toLocaleString()}</b>}
              </button>;
            })}
          </section>
          <section>
            <h2>Topics</h2>
            {payload.meta.shelves.map((item) => {
              const Icon = shelfIcons[item.name] ?? Database;
              return <button className={shelf === item.name ? "nav-item active" : "nav-item"} key={item.name} onClick={() => chooseShelf(item.name)}>
                <span className="nav-symbol"><Icon size={14} strokeWidth={1.8} /></span><span>{item.name}</span><b>{payload.meta.counts.shelves[item.name].toLocaleString()}</b>
              </button>;
            })}
          </section>
        </nav>
        <div className="sidebar-footer">
          <div><Database size={13} /><span className="live-dot" />Index ready</div>
          <small>{payload.meta.sourceCount.toLocaleString()} source items<br />{payload.meta.excludedCount.toLocaleString()} excluded as off-topic</small>
        </div>
      </aside>

      <main className="workspace">
        <header className="command-bar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={17} /></button>
          <div className="command-search">
            <span aria-hidden="true"><Search size={17} /></span>
            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bookmarks, authors, topics or domains" aria-label="Search bookmark library" autoComplete="off" spellCheck="false" />
            {query ? <button className="clear-search" onClick={() => setQuery("")} aria-label="Clear search"><X size={12} />Clear</button> : <kbd>/</kbd>}
          </div>
          <div className="command-meta"><Database size={14} /><span className="live-dot" />Local index</div>
        </header>

        <div className="dashboard-body">
          <section className="results-pane">
            <header className="page-header">
              <div><p><Library size={12} />BOOKMARK LIBRARY</p><h1>{quickViews.find((view) => view.id === quickView)?.label ?? "All bookmarks"}</h1></div>
              <button className="reset-control" onClick={resetFilters} disabled={activeFilters === 0}><RotateCcw size={13} />Reset filters {activeFilters > 0 && <span>{activeFilters}</span>}</button>
            </header>

            <section className="metric-grid" aria-label="Library summary">
              <div><span><BookOpen size={14} />Indexed</span><strong>{payload.meta.includedCount.toLocaleString()}</strong><small>technical notes</small></div>
              <div><span><Sparkles size={14} />Generative AI</span><strong>{payload.meta.counts.shelves["AI & Intelligence"].toLocaleString()}</strong><small>{Math.round(payload.meta.counts.shelves["AI & Intelligence"] / payload.meta.includedCount * 100)}% of index</small></div>
              <div><span><Code2 size={14} />Tools & code</span><strong>{toolCount.toLocaleString()}</strong><small>resources and repos</small></div>
              <div><span><MessageSquareText size={14} />Useful replies</span><strong>{commentCount.toLocaleString()}</strong><small>context-rich comments</small></div>
            </section>

            <div className="filter-bar">
              <label><span>Shelf</span><select value={shelf} onChange={(event) => { setShelf(event.target.value); setTopic("All topics"); setQuickView("all"); }}><option>All shelves</option>{payload.meta.shelves.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
              <label><span>Topic</span><select value={topic} onChange={(event) => setTopic(event.target.value)}><option>All topics</option>{topics.map(([name, count]) => <option value={name} key={name}>{name} ({count})</option>)}</select></label>
              <label><span>Format</span><select value={format} onChange={(event) => setFormat(event.target.value)}><option>All formats</option>{Object.entries(payload.meta.counts.formats).map(([name, count]) => <option value={name} key={name}>{name} ({count})</option>)}</select></label>
              <label><span>Year</span><select value={year} onChange={(event) => setYear(event.target.value)}><option>All years</option>{years.map(([name, count]) => <option value={name} key={name}>{name} ({count})</option>)}</select></label>
              <label className="sort-select"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="newest">Newest first</option>{deferredQuery && <option value="relevance">Best search match</option>}<option value="recommended">Highest signal</option><option value="popular">Most discussed</option><option value="oldest">Oldest first</option></select></label>
            </div>

            <div className="query-syntax"><span><SquareTerminal size={13} />Query fields</span><button onClick={() => setQuery("topic:agents")}>topic:</button><button onClick={() => setQuery("type:comment")}>type:</button><button onClick={() => setQuery("author:simonw")}>author:</button><button onClick={() => setQuery("domain:github.com")}>domain:</button><button onClick={() => setQuery("year:2025")}>year:</button></div>

            <div className="table-toolbar"><p><ListFilter size={14} /><strong>{filtered.length.toLocaleString()}</strong> results</p><small>Select a row to inspect it</small></div>
            <div className="result-table" role="list">
              <div className="table-head"><span>Bookmark</span><span>Author</span><span>Type</span><span>Year</span><span /></div>
              {filtered.slice(0, visible).map((record) => (
                <div className={selectedId === record.id ? "result-row selected" : "result-row"} role="listitem" key={record.id}>
                  <button className="row-main" onClick={() => setSelectedId(record.id)}>
                    <span className="row-classification"><b>{shelfCodes[record.shelf]}</b>{record.topics[0]}</span>
                    <strong>{renderHighlighted(getTitle(record), parsed.terms)}</strong>
                    <small>{renderHighlighted(getPreview(record), parsed.terms)}</small>
                  </button>
                  <button className="row-author" onClick={() => setSelectedId(record.id)}><strong>{record.author}</strong><small>@{record.handle}</small></button>
                  <button className="row-type" onClick={() => setSelectedId(record.id)}>{record.formats[0]}</button>
                  <button className="row-year" onClick={() => setSelectedId(record.id)}>{record.year}</button>
                  <a className="row-open" href={record.url} target="_blank" rel="noreferrer" aria-label={`Open bookmark by ${record.author}`}><ExternalLink size={14} /></a>
                </div>
              ))}
            </div>

            {!filtered.length && <div className="empty-state"><Search size={24} /><strong>No matching bookmarks</strong><p>Remove a filter or try a broader search.</p><button onClick={resetFilters}><RotateCcw size={13} />Clear search and filters</button></div>}
            {visible < filtered.length && <button className="load-more" onClick={() => setVisible((value) => value + PAGE_SIZE)}>Load more <ArrowDown size={14} /><span>{visible.toLocaleString()} of {filtered.length.toLocaleString()}</span></button>}
          </section>
          {selected && <DetailPanel record={selected} onClose={() => setSelectedId(null)} />}
        </div>
      </main>
    </div>
  );
}
