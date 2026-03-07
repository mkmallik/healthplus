"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Plus, Search, X, Trash2, Edit3, Mic, Image } from "lucide-react";
import api from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { formatDateISO, getDateLabel } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";
import DateNavigator from "@/components/DateNavigator";

interface NoteItem {
  id: number;
  title: string | null;
  content: string | null;
  date: string;
  audio_path: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

type Period = "day" | "7days" | "30days" | "all";

const PAGE_SIZE = 30;

function formatSectionDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatDateISO(d) === formatDateISO(today)) return "Today";
  if (formatDateISO(d) === formatDateISO(yesterday)) return "Yesterday";

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

export default function NotesPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(new Date());
  const [period, setPeriod] = useState<Period>("day");
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteItem | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");
  const [saving, setSaving] = useState(false);

  const dateStr = formatDateISO(date);

  const fetchNotes = useCallback(async (append = false) => {
    if (!append) setLoading(true);
    try {
      const currentOffset = append ? offsetRef.current : 0;
      let params: string;

      if (searchMode && searchQuery.trim()) {
        params = `?search=${encodeURIComponent(searchQuery.trim())}&limit=${PAGE_SIZE}&offset=${currentOffset}`;
      } else if (period === "day") {
        params = `?date=${dateStr}`;
      } else if (period === "all") {
        params = `?limit=${PAGE_SIZE}&offset=${currentOffset}`;
      } else {
        const daysBack = period === "7days" ? 6 : 29;
        const fromDate = new Date(date);
        fromDate.setDate(fromDate.getDate() - daysBack);
        const fromStr = formatDateISO(fromDate);
        params = `?date_from=${fromStr}&date_to=${dateStr}&limit=${PAGE_SIZE}&offset=${currentOffset}`;
      }

      const res = await api.get(`/notes${params}`);
      const newNotes: NoteItem[] = res.data;

      if (append) {
        setNotes((prev) => [...prev, ...newNotes]);
      } else {
        setNotes(newNotes);
      }

      const canPaginate = period !== "day" || searchMode;
      setHasMore(canPaginate && newNotes.length >= PAGE_SIZE);
      offsetRef.current = currentOffset + newNotes.length;
    } catch {
      if (!append) setNotes([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [dateStr, period, searchMode, searchQuery, date]);

  // Fetch on dependency change
  useEffect(() => {
    offsetRef.current = 0;
    fetchNotes(false);
  }, [fetchNotes]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          fetchNotes(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, fetchNotes]);

  const shiftDate = (days: number) => {
    setDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const openCreateModal = () => {
    setEditNote(null);
    setModalTitle("");
    setModalContent("");
    setModalOpen(true);
  };

  const openEditModal = (note: NoteItem) => {
    setEditNote(note);
    setModalTitle(note.title || "");
    setModalContent(note.content || "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!modalTitle.trim() && !modalContent.trim()) {
      showToast("Please enter a title or content.", "error");
      return;
    }
    setSaving(true);
    try {
      if (editNote) {
        await api.put(`/notes/${editNote.id}`, {
          title: modalTitle.trim() || null,
          content: modalContent.trim() || null,
        });
        showToast("Note updated!", "success");
      } else {
        const formData = new FormData();
        if (modalTitle.trim()) formData.append("title", modalTitle.trim());
        if (modalContent.trim()) formData.append("content", modalContent.trim());
        formData.append("note_date", dateStr);
        await api.post("/notes", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast("Note created!", "success");
      }
      setModalOpen(false);
      setEditNote(null);
      offsetRef.current = 0;
      fetchNotes(false);
    } catch {
      showToast(editNote ? "Failed to update note." : "Failed to create note.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this note?")) return;
    try {
      await api.delete(`/notes/${id}`);
      showToast("Note deleted", "info");
      offsetRef.current = 0;
      fetchNotes(false);
    } catch {
      showToast("Failed to delete note.", "error");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchMode(true);
      offsetRef.current = 0;
      fetchNotes(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchMode(false);
  };

  // Group notes by date for multi-day/all modes
  const groupedSections = (() => {
    if (period === "day" && !searchMode) return null;
    const grouped: Record<string, NoteItem[]> = {};
    for (const note of notes) {
      if (!grouped[note.date]) grouped[note.date] = [];
      grouped[note.date].push(note);
    }
    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((d) => ({ dateLabel: formatSectionDate(d), items: grouped[d] }));
  })();

  const PERIOD_OPTIONS: { key: Period; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "7days", label: "7 Days" },
    { key: "30days", label: "30 Days" },
    { key: "all", label: "All" },
  ];

  const renderNoteCard = (note: NoteItem, showDate: boolean) => {
    const preview = note.content
      ? note.content.length > 120
        ? note.content.slice(0, 120) + "..."
        : note.content
      : "No content";

    return (
      <div
        key={note.id}
        className="rounded-xl bg-surface p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        onClick={() => openEditModal(note)}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="h-4 w-4 flex-shrink-0" style={{ color: COLORS.primary }} />
            <h3 className="text-sm font-semibold text-text truncate">
              {note.title || "Untitled"}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {note.audio_path && (
              <Mic className="h-3.5 w-3.5" style={{ color: COLORS.accent }} />
            )}
            {note.image_path && (
              <Image className="h-3.5 w-3.5" style={{ color: COLORS.primary }} />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(note);
              }}
              className="rounded p-1 text-text-secondary hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(note.id);
              }}
              className="rounded p-1 text-error hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
          {preview}
        </p>
        {showDate && (
          <p className="text-[11px] text-text-secondary mt-2">{note.date}</p>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6 relative min-h-screen">
      {/* Date Navigator */}
      {!searchMode && (
        <DateNavigator
          label={getDateLabel(date)}
          onPrev={() => shiftDate(-1)}
          onNext={() => shiftDate(1)}
          onReset={() => setDate(new Date())}
          onDateSelect={(d) => setDate(d)}
          selectedDate={date}
        />
      )}

      <h1 className="text-2xl font-bold text-text mb-4">Notes</h1>

      {/* Period Toggle */}
      {!searchMode && (
        <div className="flex gap-2 mb-4">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p.key
                  ? "bg-primary text-white"
                  : "bg-surface text-text-secondary hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-text-secondary flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) {
                setSearchMode(true);
              }
            }}
            placeholder="Search notes..."
            className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-secondary"
          />
          {searchMode && (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-full p-0.5 text-text-secondary hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 mb-3" style={{ color: COLORS.border }} />
          <p className="text-sm text-text-secondary">
            {searchMode
              ? "No notes found"
              : period === "day"
              ? "No notes for this day"
              : "No notes in this period"}
          </p>
        </div>
      ) : groupedSections ? (
        /* Multi-day / All / Search — grouped by date */
        <div className="space-y-1 pb-24">
          {groupedSections.map((section) => (
            <div key={section.dateLabel}>
              <h2
                className="text-sm font-bold mb-2 mt-4 first:mt-0"
                style={{ color: COLORS.primary }}
              >
                {section.dateLabel}
              </h2>
              <div className="space-y-2">
                {section.items.map((note) => renderNoteCard(note, false))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Day mode — flat list */
        <div className="space-y-2 pb-24">
          {notes.map((note) => renderNoteCard(note, false))}
        </div>
      )}

      {/* Load more sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {loadingMore && <Spinner />}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openCreateModal}
        className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark transition-colors z-50"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg mx-4 rounded-2xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text">
                {editNote ? "Edit Note" : "New Note"}
              </h2>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditNote(null);
                }}
                className="rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>

            <input
              type="text"
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary mb-3"
            />

            <textarea
              value={modalContent}
              onChange={(e) => setModalContent(e.target.value)}
              placeholder="Write your note..."
              rows={6}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-primary resize-none mb-4"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditNote(null);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editNote ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
