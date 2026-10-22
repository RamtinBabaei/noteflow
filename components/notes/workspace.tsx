'use client';
import Link from 'next/link';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Feather,
  FileText,
  Home,
  Info,
  LoaderCircle,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  allTags,
  filterNotes,
  noteInput,
  parseTags,
  wordCount,
  type Note,
  type View,
} from '../../features/notes/model';
import { api } from '../../features/notes/client';
import ConfirmDialog from './dialog';
import type { Preferences } from './settings';
const Settings = lazy(() => import('./settings'));
interface Draft {
  title: string;
  tags: string;
  content: string;
}
type Confirmation = { kind: 'delete' | 'archive' | 'discard'; action: () => void };
const emptyDraft: Draft = { title: '', tags: '', content: '' };
const toDraft = (note: Note): Draft => ({
  title: note.title,
  tags: note.tags.join(', '),
  content: note.content,
});
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
function download(name: string, type: string, value: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Workspace() {
  const [notes, setNotes] = useState<Note[]>([]),
    [selected, setSelected] = useState<Note | null>(null),
    [draft, setDraft] = useState<Draft>(emptyDraft);
  const [view, setView] = useState<View>('all'),
    [tag, setTag] = useState(''),
    [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [loadError, setLoadError] = useState(''),
    [error, setError] = useState(''),
    [toast, setToast] = useState('');
  const [creating, setCreating] = useState(false),
    [mobileEditor, setMobileEditor] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [help, setHelp] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation | null>(null),
    [preferences, setPreferences] = useState<Preferences>({ theme: 'light', font: 'sans' });
  const searchRef = useRef<HTMLInputElement>(null),
    titleRef = useRef<HTMLInputElement>(null),
    helpRef = useRef<HTMLDialogElement>(null);
  const base = selected ? toDraft(selected) : emptyDraft;
  const dirty =
    (selected !== null || creating) &&
    (draft.title !== base.title || draft.tags !== base.tags || draft.content !== base.content);
  const visible = filterNotes(notes, view, tag, query),
    tags = allTags(notes);
  const activeCount = notes.filter((n) => !n.archived).length,
    archiveCount = notes.length - activeCount;
  const selectNote = useCallback((note: Note | null, showMobile = true) => {
    setSelected(note);
    setDraft(note ? toDraft(note) : emptyDraft);
    setCreating(false);
    setError('');
    setMobileEditor(showMobile && !!note);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api<{ notes: Note[] }>('/api/workspace', 'POST', {});
      setNotes(data.notes);
      selectNote(filterNotes(data.notes, 'all', '', '')[0] ?? null, false);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load notes.');
    } finally {
      setLoading(false);
    }
  }, [selectNote]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('noteflow-preferences');
      if (raw) {
        const p = JSON.parse(raw);
        if (
          ['light', 'dark', 'system'].includes(p.theme) &&
          ['sans', 'serif', 'mono'].includes(p.font)
        )
          queueMicrotask(() => setPreferences(p));
      }
    } catch {
      /* Preferences are optional when browser storage is disabled. */
    }
  }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        preferences.theme === 'system' ? (media.matches ? 'dark' : 'light') : preferences.theme;
      document.documentElement.dataset.font = preferences.font;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preferences]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  useEffect(() => {
    if (help) helpRef.current?.showModal();
    else helpRef.current?.close();
  }, [help]);
  function guard(action: () => void) {
    if (busy) return;
    if (dirty) setConfirm({ kind: 'discard', action });
    else action();
  }
  function navigate(next: View, nextTag = '') {
    guard(() => {
      setView(next);
      setTag(nextTag);
      setQuery('');
      setMenuOpen(false);
      setMobileEditor(false);
      setError('');
      if (next !== 'settings' && next !== 'tags')
        selectNote(filterNotes(notes, next, nextTag, '')[0] ?? null, false);
    });
  }
  function newNote() {
    guard(() => {
      setView('all');
      setQuery('');
      setTag('');
      setSelected(null);
      setDraft(emptyDraft);
      setCreating(true);
      setMobileEditor(true);
      setError('');
      requestAnimationFrame(() => titleRef.current?.focus());
    });
  }
  async function save() {
    if (busy) return;
    const parsed = noteInput.safeParse({
      title: draft.title,
      content: draft.content,
      tags: parseTags(draft.tags),
      archived: selected?.archived ?? false,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      if (!draft.title.trim()) titleRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api<{ note: Note }>(
        selected ? `/api/notes/${selected.id}` : '/api/notes',
        selected ? 'PUT' : 'POST',
        { ...parsed.data, ...(selected ? { version: selected.version } : {}) },
      );
      setNotes((previous) => [data.note, ...previous.filter((n) => n.id !== data.note.id)]);
      selectNote(data.note);
      setToast(
        selected ? 'Note updated. Your thoughts are safe.' : 'Note created. A good idea, captured.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save your note.');
    } finally {
      setBusy(false);
    }
  }
  async function changeArchive() {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      const { note } = await api<{ note: Note }>(`/api/notes/${selected.id}`, 'PUT', {
        title: selected.title,
        content: selected.content,
        tags: selected.tags,
        archived: !selected.archived,
        version: selected.version,
      });
      const updated = notes.map((n) => (n.id === note.id ? note : n));
      setNotes(updated);
      selectNote(filterNotes(updated, view, tag, query)[0] ?? null, false);
      setConfirm(null);
      setToast(
        note.archived ? 'Note archived. Find it in Archived Notes.' : 'Note restored to All Notes.',
      );
    } catch (e) {
      setConfirm(null);
      setError(e instanceof Error ? e.message : 'Unable to update note.');
    } finally {
      setBusy(false);
    }
  }
  async function deleteNote() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await api(`/api/notes/${selected.id}`, 'DELETE', { version: selected.version });
      const updated = notes.filter((n) => n.id !== selected.id);
      setNotes(updated);
      selectNote(filterNotes(updated, view, tag, query)[0] ?? null, false);
      setConfirm(null);
      setToast('Note permanently deleted.');
    } catch (e) {
      setConfirm(null);
      setError(e instanceof Error ? e.message : 'Unable to delete note.');
    } finally {
      setBusy(false);
    }
  }
  function requestArchive() {
    guard(() => {
      if (selected?.archived) void changeArchive();
      else setConfirm({ kind: 'archive', action: () => void changeArchive() });
    });
  }
  function requestDelete() {
    guard(() => setConfirm({ kind: 'delete', action: () => void deleteNote() }));
  }
  function cancel() {
    setDraft(base);
    setError('');
    if (creating) selectNote(visible[0] ?? null, false);
  }
  function applyPreferences(p: Preferences) {
    setPreferences(p);
    try {
      localStorage.setItem('noteflow-preferences', JSON.stringify(p));
      setToast('Your workspace, your way. Preferences saved.');
    } catch {
      setToast('Preferences applied for this visit. Browser storage is unavailable.');
    }
  }
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || confirm || help) return;
      const key = e.key.toLowerCase();
      if (key === 's' && (selected || creating)) {
        e.preventDefault();
        void save();
      }
      if (key === 'k') {
        e.preventDefault();
        guard(() => {
          setView('search');
          setMobileEditor(false);
          requestAnimationFrame(() => searchRef.current?.focus());
        });
      }
      if (key === 'n' && e.shiftKey) {
        e.preventDefault();
        newNote();
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }); // Rebind with current editor state so shortcuts never save a stale draft.
  const title =
    view === 'archive'
      ? 'Archived Notes'
      : view === 'tag'
        ? tag
        : view === 'search'
          ? 'Search Notes'
          : view === 'settings'
            ? 'Settings'
            : view === 'tags'
              ? 'Your Tags'
              : 'All Notes';
  const search = (value: string) => {
    if (dirty) {
      setConfirm({
        kind: 'discard',
        action: () => {
          setDraft(base);
          setQuery(value);
          setView('search');
          setMobileEditor(false);
        },
      });
      return;
    }
    setQuery(value);
    setView('search');
    selectNote(filterNotes(notes, 'search', '', value)[0] ?? null, false);
  };
  const exportNotes = () => {
    download(
      'noteflow-backup.json',
      'application/json',
      JSON.stringify(
        { format: 'noteflow-v1', exportedAt: new Date().toISOString(), notes },
        null,
        2,
      ),
    );
    setToast('Your notes have been exported.');
  };
  return (
    <div className={`app-shell ${mobileEditor ? 'editor-open' : ''}`}>
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      {menuOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <Link
          href="/"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate('all');
          }}
        >
          <span className="brand-icon">
            <Feather size={25} strokeWidth={1.8} />
          </span>
          <span>
            Note<span className="brand-flow">Flow</span>
            <span className="brand-period">.</span>
          </span>
        </Link>
        <div className="sidebar-scroll">
          <p className="nav-caption">WORKSPACE</p>
          <nav>
            <button
              className={`nav-item ${view === 'all' ? 'active' : ''}`}
              onClick={() => navigate('all')}
            >
              <Home size={19} />
              <span>All Notes</span>
              <span className="nav-count">{activeCount}</span>
              {view === 'all' && <ChevronRight size={15} />}
            </button>
            <button
              className={`nav-item ${view === 'archive' ? 'active' : ''}`}
              onClick={() => navigate('archive')}
            >
              <Archive size={19} />
              <span>Archived Notes</span>
              <span className="nav-count">{archiveCount}</span>
              {view === 'archive' && <ChevronRight size={15} />}
            </button>
          </nav>
          <div className="tags-heading">
            <p className="nav-caption">TAGS</p>
            <span>{tags.length}</span>
          </div>
          <nav aria-label="Tags">
            {tags.map((t) => (
              <button
                key={t}
                className={`nav-item tag-nav ${view === 'tag' && tag === t ? 'active' : ''}`}
                onClick={() => navigate('tag', t)}
              >
                <Tag size={18} />
                <span>{t}</span>
                <span className="tag-count">
                  {notes.filter((n) => !n.archived && n.tags.includes(t)).length}
                </span>
              </button>
            ))}
            {!loading && tags.length === 0 && (
              <p className="no-tags">Tags you add to notes will appear here.</p>
            )}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <Settings2 size={19} />
            <span>Settings</span>
          </button>
          <button className="nav-item help-nav" onClick={() => setHelp(true)}>
            <CircleHelp size={19} />
            <span>Help & shortcuts</span>
            <ArrowUpRight size={15} />
          </button>
          <div className="workspace-profile">
            <span className="profile-avatar">
              <Feather size={19} />
            </span>
            <span>
              <strong>My workspace</strong>
              <small>
                <span className="green-dot" />
                Personal guest space
              </small>
            </span>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <main id="workspace-main" className="workspace-main">
        <header className={`topbar ${view === 'search' ? 'search-active' : ''}`}>
          <div className="page-heading">
            <button
              className="icon-button menu-toggle"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h1>{title}</h1>
            {!['settings', 'tags', 'search'].includes(view) && (
              <span className="heading-count">
                {view === 'archive' ? archiveCount : view === 'tag' ? visible.length : activeCount}
              </span>
            )}
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button mobile-search-toggle"
              aria-label="Open search"
              onClick={() =>
                guard(() => {
                  setView('search');
                  setMobileEditor(false);
                  requestAnimationFrame(() => searchRef.current?.focus());
                })
              }
            >
              <Search size={21} />
            </button>
            <label className="search-box">
              <Search size={18} />
              <input
                ref={searchRef}
                aria-label="Search notes"
                placeholder="Search by title, content, or tags…"
                value={query}
                onChange={(e) => search(e.target.value)}
              />
              {query ? (
                <button
                  className="clear-search"
                  aria-label="Clear search"
                  onClick={() => search('')}
                >
                  <X size={15} />
                </button>
              ) : (
                <kbd>⌘ K</kbd>
              )}
            </label>
            <button
              className="icon-button topbar-settings"
              aria-label="Open settings"
              onClick={() => navigate('settings')}
            >
              <Settings2 size={21} />
            </button>
          </div>
        </header>
        {loading ? (
          <div className="loading-state" role="status">
            <LoaderCircle className="spin" size={28} />
            <h2>Making a little space…</h2>
            <p>Loading your notes.</p>
          </div>
        ) : loadError ? (
          <div className="empty-state" role="alert">
            <Info size={32} />
            <h2>Let’s try that again.</h2>
            <p>{loadError}</p>
            <button className="button primary" onClick={() => void load()}>
              <RotateCcw size={16} />
              Retry
            </button>
          </div>
        ) : view === 'settings' ? (
          <Suspense fallback={<div className="loading-state">Loading settings…</div>}>
            <Settings preferences={preferences} onApply={applyPreferences} onExport={exportNotes} />
          </Suspense>
        ) : view === 'tags' ? (
          <section className="mobile-tags">
            <span className="eyebrow">A PLACE FOR EVERYTHING</span>
            <h2>Find your thread.</h2>
            <p>Explore your notes, one tag at a time.</p>
            {tags.map((t) => (
              <button className="tag-tile" key={t} onClick={() => navigate('tag', t)}>
                <Tag size={20} />
                <strong>{t}</strong>
                <span>{notes.filter((n) => !n.archived && n.tags.includes(t)).length} notes</span>
                <ChevronRight size={18} />
              </button>
            ))}
            {!tags.length && <p>Add tags when creating a note to organize your thoughts.</p>}
          </section>
        ) : (
          <div className="notes-layout">
            <section className="note-list" aria-label="Notes">
              <div className="list-controls">
                <button className="button primary create-note" onClick={newNote}>
                  <Plus size={18} />
                  Create New Note<kbd>⇧ ⌘ N</kbd>
                </button>
                <div className="list-subheading">
                  <span>
                    {view === 'archive'
                      ? 'TUCKED AWAY'
                      : view === 'search'
                        ? 'SEARCH RESULTS'
                        : view === 'tag'
                          ? 'TAGGED NOTES'
                          : 'YOUR NOTES'}
                  </span>
                  <span>
                    {visible.length} {visible.length === 1 ? 'note' : 'notes'}
                    <ChevronDown size={13} />
                  </span>
                </div>
                {view === 'archive' && (
                  <p className="archive-description">
                    A little out of the way, always within reach.
                  </p>
                )}
                {view === 'search' && (
                  <p className="archive-description">
                    {query
                      ? `Results for “${query}”`
                      : 'Find a thought by its title, content, or tags.'}
                  </p>
                )}
              </div>
              <div className="notes-scroll">
                {creating && (
                  <div className="new-note-placeholder">
                    <Feather size={18} />
                    <span>A new thought…</span>
                  </div>
                )}
                {visible.map((note) => (
                  <button
                    key={note.id}
                    className={`note-card ${selected?.id === note.id && !creating ? 'selected' : ''}`}
                    aria-pressed={selected?.id === note.id && !creating}
                    onClick={() => guard(() => selectNote(note))}
                  >
                    <div className="note-card-heading">
                      <h2>{note.title}</h2>
                      {selected?.id === note.id && !creating && (
                        <span className="selected-indicator" />
                      )}
                    </div>
                    <div className="tag-chips">
                      {note.tags.map((t) => (
                        <span key={t} className="tag-chip">
                          {t}
                        </span>
                      ))}
                      {note.archived && (
                        <span className="tag-chip">
                          <Archive size={11} />
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="note-excerpt">
                      {note.content || 'A little space, ready for your thoughts.'}
                    </p>
                    <time dateTime={note.updatedAt}>{dateLabel(note.updatedAt)}</time>
                  </button>
                ))}
                {!visible.length && !creating && (
                  <div className="list-empty">
                    <Search size={27} />
                    <h3>
                      {view === 'search'
                        ? 'No notes found'
                        : view === 'archive'
                          ? 'Nothing archived yet'
                          : 'A fresh page awaits'}
                    </h3>
                    <p>
                      {view === 'search'
                        ? 'Try a different word or tag.'
                        : view === 'archive'
                          ? 'Archived notes will be right here.'
                          : 'Capture an idea with a new note.'}
                    </p>
                    {view === 'search' && query && (
                      <button className="text-button" onClick={() => search('')}>
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="list-footer">
                <ShieldCheck size={13} />
                Saved to your private workspace
              </div>
            </section>
            <section className="editor" aria-label="Note editor">
              {selected || creating ? (
                <>
                  <div className="mobile-editor-bar">
                    <button
                      className="text-button"
                      onClick={() => guard(() => setMobileEditor(false))}
                    >
                      <ArrowLeft size={17} />
                      Back
                    </button>
                    <div>
                      {selected && (
                        <>
                          <button
                            className="icon-button"
                            aria-label={selected.archived ? 'Restore note' : 'Archive note'}
                            onClick={requestArchive}
                            disabled={busy}
                          >
                            {selected.archived ? <RotateCcw size={18} /> : <Archive size={18} />}
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Delete note"
                            onClick={requestDelete}
                            disabled={busy}
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <form
                    className="editor-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save();
                    }}
                  >
                    <div className="editor-heading">
                      <div className="note-breadcrumb">
                        <FileText size={14} />
                        <span>{selected?.archived ? 'Archived Notes' : 'All Notes'}</span>
                        <ChevronRight size={12} />
                        <span>{creating ? 'New note' : 'Note'}</span>
                      </div>
                      <input
                        ref={titleRef}
                        className="note-title"
                        aria-label="Note title"
                        aria-invalid={!!error && !draft.title.trim()}
                        aria-describedby={error ? 'editor-error' : undefined}
                        placeholder="Enter a title…"
                        maxLength={120}
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        disabled={busy}
                      />
                      <div className="note-metadata">
                        <label className="metadata-row">
                          <span>
                            <Tag size={16} />
                            Tags
                          </span>
                          <input
                            aria-label="Note tags"
                            placeholder="Add tags, separated by commas"
                            value={draft.tags}
                            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                            disabled={busy}
                          />
                        </label>
                        <div className="metadata-row">
                          <span>
                            <Clock3 size={16} />
                            Last edited
                          </span>
                          <time dateTime={selected?.updatedAt}>
                            {selected ? dateLabel(selected.updatedAt) : 'Not yet saved'}
                          </time>
                        </div>
                        {selected?.archived && (
                          <div className="metadata-row">
                            <span>
                              <Archive size={16} />
                              Status
                            </span>
                            <span className="archived-label">Archived</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <label className="sr-only" htmlFor="note-content">
                      Note content
                    </label>
                    <textarea
                      id="note-content"
                      className="note-content"
                      placeholder="Start writing. Make room for a new idea…"
                      value={draft.content}
                      maxLength={50000}
                      onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                      disabled={busy}
                    />
                    {error && (
                      <p className="editor-error" id="editor-error" role="alert">
                        <Info size={16} />
                        {error}
                      </p>
                    )}
                    <footer className="editor-footer">
                      <div className="save-actions">
                        <button className="button primary" type="submit" disabled={busy}>
                          {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
                          <span>{busy ? 'Saving…' : 'Save Note'}</span>
                        </button>
                        <button
                          className="button secondary"
                          type="button"
                          onClick={cancel}
                          disabled={busy || (!dirty && !creating)}
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="editor-stats">
                        <span>{wordCount(draft.content)} words</span>
                        <span className={dirty ? 'unsaved-status' : 'saved-status'}>
                          {dirty ? (
                            <>
                              <span className="amber-dot" />
                              Unsaved changes
                            </>
                          ) : creating ? (
                            <>Not yet saved</>
                          ) : (
                            <>
                              <Check size={13} />
                              All changes saved
                            </>
                          )}
                        </span>
                      </div>
                    </footer>
                  </form>
                </>
              ) : (
                <div className="empty-state editor-empty">
                  <span className="empty-quill">
                    <Feather size={33} />
                  </span>
                  <span className="eyebrow">ROOM TO THINK</span>
                  <h2>
                    {view === 'archive' ? 'An uncluttered mind.' : 'Every good idea starts here.'}
                  </h2>
                  <p>
                    {view === 'archive'
                      ? 'Your archived notes will be waiting here when you need them.'
                      : 'Select a note or turn a passing thought into something worth keeping.'}
                  </p>
                  <button className="button primary" onClick={newNote}>
                    <Plus size={17} />
                    Create a note
                  </button>
                </div>
              )}
            </section>
            <aside className="note-actions" aria-label="Note actions">
              {selected && !creating ? (
                <>
                  <button className="button outline" onClick={requestArchive} disabled={busy}>
                    {selected.archived ? <RotateCcw size={18} /> : <Archive size={18} />}
                    <span>{selected.archived ? 'Restore Note' : 'Archive Note'}</span>
                  </button>
                  <button
                    className="button outline delete-action"
                    onClick={requestDelete}
                    disabled={busy}
                  >
                    <Trash2 size={18} />
                    <span>Delete Note</span>
                  </button>
                  <div className="action-divider" />
                  <button
                    className="export-note"
                    onClick={() =>
                      download(
                        `${selected.title.replace(/[^a-z0-9]/gi, '-').slice(0, 60) || 'note'}.txt`,
                        'text/plain',
                        selected.title + '\n\n' + selected.content,
                      )
                    }
                  >
                    <ArrowDownToLine size={16} />
                    Export note
                  </button>
                  <div className="writing-tip">
                    <span>
                      <Feather size={18} />
                    </span>
                    <h3>A thought worth keeping.</h3>
                    <p>Little ideas become big things. Give yours a place to grow.</p>
                    <div />
                  </div>
                </>
              ) : (
                <div className="new-note-tip">
                  <Feather size={22} />
                  <p>
                    A blank page.
                    <br />A world of possibilities.
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button className={view === 'all' ? 'active' : ''} onClick={() => navigate('all')}>
            <Home size={20} />
            <span>Home</span>
          </button>
          <button
            className={view === 'search' ? 'active' : ''}
            onClick={() =>
              guard(() => {
                setView('search');
                setMobileEditor(false);
                requestAnimationFrame(() => searchRef.current?.focus());
              })
            }
          >
            <Search size={20} />
            <span>Search</span>
          </button>
          <button
            className={view === 'archive' ? 'active' : ''}
            onClick={() => navigate('archive')}
          >
            <Archive size={20} />
            <span>Archived</span>
          </button>
          <button
            className={view === 'tags' || view === 'tag' ? 'active' : ''}
            onClick={() => navigate('tags')}
          >
            <Tag size={20} />
            <span>Tags</span>
          </button>
          <button
            className={view === 'settings' ? 'active' : ''}
            onClick={() => navigate('settings')}
          >
            <Settings2 size={20} />
            <span>Settings</span>
          </button>
        </nav>
      </main>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={17} />
          </span>
          <p>{toast}</p>
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          kind={confirm.kind}
          onCancel={() => setConfirm(null)}
          busy={busy}
          onConfirm={() => {
            const action = confirm.action;
            if (confirm.kind === 'discard') {
              setConfirm(null);
              setDraft(base);
            }
            action();
          }}
        />
      )}
      <dialog
        ref={helpRef}
        className="help-dialog"
        aria-labelledby="help-title"
        onCancel={() => setHelp(false)}
      >
        <button
          className="icon-button help-close"
          aria-label="Close help"
          onClick={() => setHelp(false)}
        >
          <X size={20} />
        </button>
        <span className="brand-icon">
          <Feather size={25} />
        </span>
        <h2 id="help-title">A little help finding your flow.</h2>
        <p>Write, organize, and come back to what matters.</p>
        <dl>
          <div>
            <dt>Find a note</dt>
            <dd>
              <kbd>Ctrl / ⌘ K</kbd>
            </dd>
          </div>
          <div>
            <dt>Create a note</dt>
            <dd>
              <kbd>Ctrl / ⌘ Shift N</kbd>
            </dd>
          </div>
          <div>
            <dt>Save your changes</dt>
            <dd>
              <kbd>Ctrl / ⌘ S</kbd>
            </dd>
          </div>
        </dl>
        <p className="help-info">
          <Info size={17} />
          Add tags with commas. Search finds titles, content, and tags, including archived notes.
          Your guest workspace lasts 90 days in this browser. Export your notes from Settings to
          keep a backup.
        </p>
        <button className="button primary" onClick={() => setHelp(false)}>
          Back to my notes
          <ArrowUpRight size={16} />
        </button>
      </dialog>
    </div>
  );
}
