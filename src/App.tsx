import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Analytics } from "@vercel/analytics/react";
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  Search, Star, Bookmark, Clipboard, Camera, AlertTriangle, Eye, EyeOff, 
  RotateCcw, ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight, Grid, 
  Compass, BookOpen, Award, CheckCircle2, XCircle, X, Filter, Check, 
  ExternalLink, FileText, Sparkles, HelpCircle, Download
} from 'lucide-react';
import { allQuestions } from './data/questions';
import type { Question } from './types';

const getProxiedImageUrl = (url: string | null): string => {
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('data:')) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
};

export default function App() {
  // --- STATE FOR USER PROGRESS & PERSISTENCE ---
  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('geosh_starred');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [reviewedIds, setReviewedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('geosh_reviewed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('geosh_answers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [revealedIds, setRevealedIds] = useState<string[]>([]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('geosh_starred', JSON.stringify(starredIds));
  }, [starredIds]);

  useEffect(() => {
    localStorage.setItem('geosh_reviewed', JSON.stringify(reviewedIds));
  }, [reviewedIds]);

  useEffect(() => {
    localStorage.setItem('geosh_answers', JSON.stringify(userAnswers));
  }, [userAnswers]);

  // --- FILTER & SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['uh-butler', 'examveda', 'oxford']);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showReviewedOnly, setShowReviewedOnly] = useState(false);
  const [showFiguresOnly, setShowFiguresOnly] = useState(false);
  const [showUnansweredOnly, setShowUnansweredOnly] = useState(false);
  const [showIncorrectOnly, setShowIncorrectOnly] = useState(false);

  // --- VIEW MODE ---
  // 'practice' = comprehensive grid list; 'focus' = centered single-card mode
  const [viewMode, setViewMode] = useState<'practice' | 'focus'>('practice');
  const [focusIndex, setFocusIndex] = useState(0);

  // --- NOTIFICATION STATE ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- FIGURE VIEWER MODAL STATE ---
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // --- REPORT ISSUE MODAL STATE ---
  const [reportingQuestion, setReportingQuestion] = useState<Question | null>(null);
  const [issueType, setIssueType] = useState('typo');
  const [issueComment, setIssueComment] = useState('');

  // --- EXTRACT DISTINCT CATEGORIES & CHAPTERS FOR SIDEBAR FILTERS ---
  const categories = useMemo(() => {
    const list = new Set<string>();
    allQuestions.forEach(q => {
      if (q.category) list.add(q.category);
    });
    return Array.from(list).sort();
  }, []);

  const chapters = useMemo(() => {
    const list = new Map<string, { title: string; source: string; num: number }>();
    allQuestions.forEach(q => {
      if (q.chapter) {
        list.set(q.chapter, {
          title: q.chapterTitle || q.chapter,
          source: q.source,
          num: q.chapterNum || 0
        });
      }
    });
    return Array.from(list.entries()).map(([key, value]) => ({
      key,
      ...value
    })).sort((a, b) => {
      if (a.source !== b.source) return a.source.localeCompare(b.source);
      return a.num - b.num;
    });
  }, []);

  // Filter chapters based on active sources
  const filteredChapterOptions = useMemo(() => {
    return chapters.filter(ch => selectedSources.includes(ch.source));
  }, [chapters, selectedSources]);

  // --- FILTERED QUESTIONS CALCULATION ---
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      // Source filter
      if (!selectedSources.includes(q.source)) return false;

      // Category filter
      if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;

      // Chapter filter
      if (selectedChapter !== 'all' && q.chapter !== selectedChapter) return false;

      // Search Query filter (matches text, choices, chapter, category, tags)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const textMatch = q.text.toLowerCase().includes(query);
        const choiceMatch = Object.values(q.choices).some(choice => choice?.toLowerCase().includes(query));
        const chapterMatch = q.chapterTitle.toLowerCase().includes(query) || q.chapter.toLowerCase().includes(query);
        const categoryMatch = q.category.toLowerCase().includes(query);
        const tagMatch = q.tags?.some(t => t.toLowerCase().includes(query));
        
        if (!textMatch && !choiceMatch && !chapterMatch && !categoryMatch && !tagMatch) {
          return false;
        }
      }

      // Checkbox filters
      if (showStarredOnly && !starredIds.includes(q.id)) return false;
      if (showReviewedOnly && !reviewedIds.includes(q.id)) return false;
      if (showFiguresOnly && !q.imageUrl && !q.tableHtml) return false;
      
      const answered = userAnswers[q.id] !== undefined;
      if (showUnansweredOnly && answered) return false;
      
      const isCorrect = userAnswers[q.id] === q.correctAnswer;
      if (showIncorrectOnly && (!answered || isCorrect)) return false;

      return true;
    });
  }, [
    selectedSources, selectedCategory, selectedChapter, searchQuery,
    showStarredOnly, showReviewedOnly, showFiguresOnly, showUnansweredOnly,
    showIncorrectOnly, starredIds, reviewedIds, userAnswers
  ]);

  // Reset focus index if it exceeds filtered length
  useEffect(() => {
    if (focusIndex >= filteredQuestions.length && filteredQuestions.length > 0) {
      setFocusIndex(filteredQuestions.length - 1);
    } else if (filteredQuestions.length === 0) {
      setFocusIndex(0);
    }
  }, [filteredQuestions, focusIndex]);

  // --- SCORE STATISTICS ---
  const stats = useMemo(() => {
    let totalAnswered = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;

    // We only count statistics within allQuestions
    allQuestions.forEach(q => {
      const ans = userAnswers[q.id];
      if (ans !== undefined) {
        totalAnswered++;
        if (ans === q.correctAnswer) {
          totalCorrect++;
        } else {
          totalIncorrect++;
        }
      }
    });

    const percentCorrect = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    return {
      totalQuestions: allQuestions.length,
      answered: totalAnswered,
      correct: totalCorrect,
      incorrect: totalIncorrect,
      percentage: percentCorrect,
      starred: starredIds.length,
      reviewed: reviewedIds.length
    };
  }, [userAnswers, starredIds, reviewedIds]);

  // --- RESTART / RESET ENTIRE STATE ---
  const resetProgress = () => {
    if (window.confirm('Are you sure you want to reset all your progress, answers, and stars? This cannot be undone.')) {
      setUserAnswers({});
      setStarredIds([]);
      setReviewedIds([]);
      setRevealedIds([]);
      showToast('All progress and study history has been reset.');
    }
  };

  // --- SELECTION HANDLER ---
  const handleSelectOption = (questionId: string, optionKey: string) => {
    // If already answered, allow changing, or make it immutable based on study flow. Let's allow changing.
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionKey
    }));
  };

  // --- TOGGLE REVEAL ANSWER ---
  const toggleReveal = (id: string) => {
    setRevealedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // --- TOGGLE STAR ---
  const toggleStar = (id: string) => {
    setStarredIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    showToast(starredIds.includes(id) ? 'Removed from starred questions.' : 'Added to starred questions.');
  };

  // --- TOGGLE REVIEW ---
  const toggleReview = (id: string) => {
    setReviewedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    showToast(reviewedIds.includes(id) ? 'Removed from review bookmarks.' : 'Marked for review.');
  };

  // --- COPY TEXT TO CLIPBOARD ---
  const copyQuestionText = (q: Question) => {
    const optionsText = Object.entries(q.choices)
      .filter(([_, val]) => !!val)
      .map(([key, val]) => `${key.toUpperCase()}) ${val}`)
      .join('\n');
    
    const formatted = `Question ID: ${q.id} (${q.category})\nSource: ${q.source.toUpperCase()} - ${q.chapterTitle}\n\n${q.text}\n\n${optionsText}\n\nCorrect Answer: ${q.correctAnswer.toUpperCase()}`;
    
    navigator.clipboard.writeText(formatted);
    showToast('Question text and choices copied to clipboard!');
  };

  // --- CAPTURE QUESTION CARD TO IMAGE ---
  const captureCardImage = async (id: string) => {
    const el = document.getElementById(`question-card-${id}`);
    if (!el) {
      showToast('Error capturing card element.');
      return;
    }
    
    try {
      // Temporarily hide action buttons or reveal states to make it look like a clean printout card
      const actionsEl = el.querySelector('.card-actions');
      if (actionsEl) (actionsEl as HTMLElement).style.opacity = '0';

      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2 // Crisp high density scaling
      });

      if (actionsEl) (actionsEl as HTMLElement).style.opacity = '1';

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `GeoSharp_Question_${id}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Card successfully generated & saved as PNG!');
    } catch (err) {
      console.error(err);
      showToast('Could not save image due to network image origin security rules. (Original figures are loaded from official URLs)');
    }
  };

  // --- SUBMIT ISSUE REPORT ---
  const submitIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingQuestion) return;

    // Simulate saving report
    showToast(`Issue reported for ${reportingQuestion.id}! Thank you for keeping Geo# accurate.`);
    setReportingQuestion(null);
    setIssueComment('');
  };

  // --- RESET ALL FILTERS ---
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSources(['uh-butler', 'examveda', 'oxford']);
    setSelectedCategory('all');
    setSelectedChapter('all');
    setShowStarredOnly(false);
    setShowReviewedOnly(false);
    setShowFiguresOnly(false);
    setShowUnansweredOnly(false);
    setShowIncorrectOnly(false);
    showToast('All search filters have been cleared.');
  };

  // --- DUAL MODE KEYBOARD LISTENER ---
  useEffect(() => {
    if (viewMode !== 'focus' || filteredQuestions.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const q = filteredQuestions[focusIndex];
      if (!q) return;

      if (e.key === 'ArrowLeft') {
        setFocusIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setFocusIndex(prev => Math.min(filteredQuestions.length - 1, prev + 1));
      } else if (e.key.toLowerCase() === 'r') {
        toggleReveal(q.id);
      } else if (e.key.toLowerCase() === 's') {
        toggleStar(q.id);
      } else if (e.key.toLowerCase() === 'f') {
        toggleReview(q.id);
      } else if (['a', 'b', 'c', 'd', 'e'].includes(e.key.toLowerCase())) {
        const option = e.key.toLowerCase();
        if (q.choices[option]) {
          handleSelectOption(q.id, option);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, focusIndex, filteredQuestions]);

  // --- FULLSCREEN ZOOM & PAN HANDLERS ---
  const handleZoom = (factor: number) => {
    setZoomScale(prev => Math.min(4, Math.max(0.8, prev + factor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100/40 to-zinc-50 text-slate-800 flex flex-col antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white py-3 px-6 rounded-full shadow-xl text-sm font-medium flex items-center gap-2 border border-slate-700/50 backdrop-blur-sm"
          >
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-md shadow-emerald-200">
            <Compass className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-display tracking-tight text-slate-950">Geo#</h1>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-medium border border-slate-200">v1.2</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Ultimate Geology Test Bank & study companion</p>
          </div>
        </div>

        {/* PROGRESS MINI BAR */}
        <div className="flex items-center gap-4 flex-wrap bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 max-w-full">
          <div className="flex items-center gap-2 text-xs">
            <Award className="h-4 w-4 text-emerald-600" />
            <span className="text-slate-500 font-medium">Overall Progress:</span>
            <span className="font-bold text-slate-950">{stats.answered} / {stats.totalQuestions} ({Math.round(stats.answered / stats.totalQuestions * 100)}%)</span>
          </div>
          
          <div className="h-3 w-28 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
            <div 
              className="h-full bg-emerald-600 transition-all duration-500" 
              style={{ width: `${(stats.answered / stats.totalQuestions) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-950">{stats.percentage}% Accuracy</span>
          </div>
        </div>

        {/* MODE SWITCHER */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setViewMode('practice')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${viewMode === 'practice' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Grid className="h-3.5 w-3.5" />
            Practice Mode
          </button>
          <button
            onClick={() => setViewMode('focus')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${viewMode === 'focus' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Focus Study Mode
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* SIDEBAR FILTERS (Advanced Search) */}
        <aside className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 flex flex-col gap-6 shrink-0 max-h-[none] lg:max-h-[calc(100vh-65px)] lg:overflow-y-auto">
          
          {/* SEARCH FIELD */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search Question Bank</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords, topics..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-slate-400 font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 h-5 w-5 bg-slate-200/80 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xs"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* DYNAMIC CHECKS (FLAG/STAR FILTERS) */}
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Interactive Filters</label>
            
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer py-1 hover:text-slate-900">
              <input
                type="checkbox"
                checked={showStarredOnly}
                onChange={(e) => setShowStarredOnly(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1.5">
                <Star className={`h-4 w-4 ${showStarredOnly ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                Starred Only ({stats.starred})
              </span>
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer py-1 hover:text-slate-900">
              <input
                type="checkbox"
                checked={showReviewedOnly}
                onChange={(e) => setShowReviewedOnly(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1.5">
                <Bookmark className={`h-4 w-4 ${showReviewedOnly ? 'fill-indigo-400 text-indigo-500' : 'text-slate-400'}`} />
                Marked for Review ({stats.reviewed})
              </span>
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer py-1 hover:text-slate-900">
              <input
                type="checkbox"
                checked={showFiguresOnly}
                onChange={(e) => setShowFiguresOnly(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1.5">
                <Maximize2 className="h-4 w-4 text-slate-400" />
                Figures & Tables Only
              </span>
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer py-1 hover:text-slate-900">
              <input
                type="checkbox"
                checked={showUnansweredOnly}
                onChange={(e) => setShowUnansweredOnly(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-slate-400" />
                Unanswered Only ({stats.totalQuestions - stats.answered})
              </span>
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer py-1 hover:text-slate-900">
              <input
                type="checkbox"
                checked={showIncorrectOnly}
                onChange={(e) => setShowIncorrectOnly(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-slate-400" />
                Incorrect Only ({stats.incorrect})
              </span>
            </label>
          </div>

          <hr className="border-slate-100" />

          {/* SOURCE SELECTION */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Question Sources</label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'uh-butler', label: 'J. Butler Physical Geology' },
                { id: 'examveda', label: 'Examveda Test Bank' },
                { id: 'oxford', label: 'Oxford University Press' }
              ].map(src => {
                const count = allQuestions.filter(q => q.source === src.id).length;
                return (
                  <label key={src.id} className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(src.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSources(prev => [...prev, src.id]);
                        } else {
                          setSelectedSources(prev => prev.filter(x => x !== src.id));
                        }
                      }}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="flex-1 flex justify-between">
                      <span>{src.label}</span>
                      <span className="text-slate-400 font-mono text-xs">{count}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* TOPIC / CATEGORY FILTER */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Geologic Topic</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="all">All Topics (Any Category)</option>
              {categories.map(cat => {
                const count = allQuestions.filter(q => q.category === cat).length;
                return <option key={cat} value={cat}>{cat} ({count})</option>;
              })}
            </select>
          </div>

          {/* CHAPTER FILTER */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chapter Filter</label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="all">All Chapters</option>
              {filteredChapterOptions.map(ch => {
                const count = allQuestions.filter(q => q.chapter === ch.key).length;
                return (
                  <option key={ch.key} value={ch.key}>
                    [{ch.source.replace('-butler', '')}] Ch{ch.num}: {ch.title} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="mt-auto pt-4 flex flex-col gap-2">
            <button
              onClick={resetFilters}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
            <button
              onClick={resetProgress}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-100 text-xs font-semibold text-rose-700 hover:bg-rose-50/50 hover:text-rose-800 transition-all active:scale-95"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reset Study History
            </button>
          </div>
        </aside>

        {/* STUDY STAGE AREA */}
        <main className="flex-1 bg-slate-50 p-4 md:p-8 overflow-y-auto max-h-[none] lg:max-h-[calc(100vh-65px)]">
          
          {/* SEARCH METRIC & FILTER BUBBLES */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Found <span className="font-bold text-slate-950">{filteredQuestions.length}</span> matching questions
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {showStarredOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  Starred
                  <X className="h-3 w-3 cursor-pointer hover:text-amber-950" onClick={() => setShowStarredOnly(false)} />
                </span>
              )}
              {showReviewedOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold">
                  Reviewed
                  <X className="h-3 w-3 cursor-pointer hover:text-indigo-950" onClick={() => setShowReviewedOnly(false)} />
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  {selectedCategory}
                  <X className="h-3 w-3 cursor-pointer hover:text-emerald-950" onClick={() => setSelectedCategory('all')} />
                </span>
              )}
              {selectedChapter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                  Ch: {selectedChapter}
                  <X className="h-3 w-3 cursor-pointer hover:text-slate-950" onClick={() => setSelectedChapter('all')} />
                </span>
              )}
            </div>
          </div>

          {/* DUAL MODE RENDER */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm max-w-xl mx-auto my-12">
              <HelpCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 font-display">No Geology Questions Found</h3>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                We couldn't find any questions matching your current filters or search parameters. Try broadening your criteria or resetting filters in the sidebar.
              </p>
              <button
                onClick={resetFilters}
                className="mt-6 inline-flex items-center gap-2 bg-slate-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-slate-850 active:scale-95 shadow-lg shadow-slate-900/10 transition-all"
              >
                Clear All Filters
              </button>
            </div>
          ) : viewMode === 'practice' ? (
            
            // --- PRACTICE LIST VIEW ---
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredQuestions.map((q, idx) => (
                <QuestionCard 
                  key={q.id}
                  question={q}
                  idx={idx}
                  userAnswer={userAnswers[q.id]}
                  isStarred={starredIds.includes(q.id)}
                  isReviewed={reviewedIds.includes(q.id)}
                  isRevealed={revealedIds.includes(q.id)}
                  onSelectOption={handleSelectOption}
                  onToggleStar={toggleStar}
                  onToggleReview={toggleReview}
                  onToggleReveal={toggleReveal}
                  onCopy={copyQuestionText}
                  onCapture={captureCardImage}
                  onReport={setReportingQuestion}
                  onFullscreenImage={setFullscreenImage}
                />
              ))}
            </div>
          ) : (
            
            // --- FOCUS SLIDE VIEW ---
            <div className="max-w-3xl mx-auto">
              <div className="mb-4 flex items-center justify-between text-xs text-slate-500 font-bold bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span>FOCUS PRACTICE SHEET</span>
                <span className="font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
                  Slide {focusIndex + 1} of {filteredQuestions.length}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={filteredQuestions[focusIndex].id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                >
                  <QuestionCard 
                    question={filteredQuestions[focusIndex]}
                    idx={focusIndex}
                    userAnswer={userAnswers[filteredQuestions[focusIndex].id]}
                    isStarred={starredIds.includes(filteredQuestions[focusIndex].id)}
                    isReviewed={reviewedIds.includes(filteredQuestions[focusIndex].id)}
                    isRevealed={revealedIds.includes(filteredQuestions[focusIndex].id)}
                    onSelectOption={handleSelectOption}
                    onToggleStar={toggleStar}
                    onToggleReview={toggleReview}
                    onToggleReveal={toggleReveal}
                    onCopy={copyQuestionText}
                    onCapture={captureCardImage}
                    onReport={setReportingQuestion}
                    onFullscreenImage={setFullscreenImage}
                  />
                </motion.div>
              </AnimatePresence>

              {/* NAVIGATION BAR */}
              <div className="mt-6 flex items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
                <button
                  onClick={() => setFocusIndex(prev => Math.max(0, prev - 1))}
                  disabled={focusIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="hidden sm:flex gap-1">
                  {Array.from({ length: Math.min(5, filteredQuestions.length) }).map((_, i) => {
                    let pageIdx = focusIndex - 2 + i;
                    if (focusIndex < 2) pageIdx = i;
                    if (focusIndex > filteredQuestions.length - 3) pageIdx = filteredQuestions.length - 5 + i;
                    if (pageIdx < 0 || pageIdx >= filteredQuestions.length) return null;
                    
                    const answered = userAnswers[filteredQuestions[pageIdx].id] !== undefined;
                    const correct = userAnswers[filteredQuestions[pageIdx].id] === filteredQuestions[pageIdx].correctAnswer;

                    return (
                      <button
                        key={pageIdx}
                        onClick={() => setFocusIndex(pageIdx)}
                        className={`h-9 w-9 text-xs rounded-xl font-bold border transition-all ${
                          focusIndex === pageIdx 
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                            : answered
                              ? correct 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        {pageIdx + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setFocusIndex(prev => Math.min(filteredQuestions.length - 1, prev + 1))}
                  disabled={focusIndex === filteredQuestions.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-750 transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 shadow-md shadow-emerald-600/10"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* QUICK HOTKEY TIPS */}
              <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center gap-4 text-[11px] text-slate-500 font-semibold font-mono flex-wrap">
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded text-slate-800 shadow-sm">←</kbd>/<kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded text-slate-800 shadow-sm">→</kbd> Navigate</span>
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded text-slate-800 shadow-sm">A</kbd> - <kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded text-slate-800 shadow-sm">E</kbd> Answer</span>
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded text-slate-800 shadow-sm">R</kbd> Reveal</span>
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded text-slate-800 shadow-sm">S</kbd> Star</span>
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded text-slate-800 shadow-sm">F</kbd> Bookmark</span>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* FULLSCREEN FIGURE ZOOM MODAL */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col justify-between p-4 md:p-8"
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between text-white z-10">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-emerald-400" />
                <span className="font-semibold text-sm">Geo# Figure Analysis (Drag to Pan, Scroll or Buttons to Zoom)</span>
              </div>
              <button 
                onClick={() => {
                  setFullscreenImage(null);
                  setZoomScale(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-all shadow-md active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Canvas Stage */}
            <div 
              className="flex-1 w-full relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                src={getProxiedImageUrl(fullscreenImage)}
                alt="Fullscreen Geologic Figure"
                className="max-h-[85vh] max-w-[90vw] object-contain transition-transform duration-75 origin-center pointer-events-none"
                style={{
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale})`,
                }}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Modal Bottom Controls */}
            <div className="flex items-center justify-center gap-3 z-10 mb-4">
              <button 
                onClick={() => handleZoom(-0.2)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <ZoomOut className="h-4 w-4" />
                Zoom Out
              </button>
              <button 
                onClick={() => {
                  setZoomScale(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-600/10"
              >
                Reset Layout
              </button>
              <button 
                onClick={() => handleZoom(0.2)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <ZoomIn className="h-4 w-4" />
                Zoom In
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT ISSUE POPUP MODAL */}
      <AnimatePresence>
        {reportingQuestion && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="bg-slate-55 text-slate-950 p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 font-display font-bold">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>Report Question Issue</span>
                </div>
                <button 
                  onClick={() => setReportingQuestion(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full p-1.5 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={submitIssue} className="p-6 flex flex-col gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600 font-semibold font-mono">
                  Question ID: <span className="font-bold text-slate-900">{reportingQuestion.id}</span>
                  <div className="mt-1 line-clamp-2 text-slate-500 italic">"{reportingQuestion.text}"</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Issue Category</label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="typo">Typographical Error / Misspelling</option>
                    <option value="answer_key">Incorrect Answer Key Option</option>
                    <option value="broken_image">Missing / Broken Figure Image</option>
                    <option value="other">Other Structural Discrepancy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description / Comments</label>
                  <textarea
                    required
                    value={issueComment}
                    onChange={(e) => setIssueComment(e.target.value)}
                    rows={4}
                    placeholder="Provide details about the correction needed (e.g. choice B should be C because...)"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingQuestion(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-md shadow-slate-900/10"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER BAR */}
      <footer className="bg-white border-t border-slate-200 py-6 px-8 text-center text-xs text-slate-500 font-medium">
        <p>© 2026 Geo# Geology Test Bank. AASH S'26</p>
        <p className="mt-1 text-[11px] text-slate-400">Questions curated from J. Butler, Oxford University Press, and Examveda Remote Sensing banks.</p>
      </footer>
    </div>
    <Analytics />
  );
}

// ==========================================
// INDIVIDUAL QUESTION CARD COMPONENT
// ==========================================
interface CardProps {
  key?: React.Key | string | number;
  question: Question;
  idx: number;
  userAnswer?: string;
  isStarred: boolean;
  isReviewed: boolean;
  isRevealed: boolean;
  onSelectOption: (id: string, opt: string) => void;
  onToggleStar: (id: string) => void;
  onToggleReview: (id: string) => void;
  onToggleReveal: (id: string) => void;
  onCopy: (q: Question) => void;
  onCapture: (id: string) => void;
  onReport: (q: Question) => void;
  onFullscreenImage: (url: string) => void;
}

function QuestionCard({
  question,
  idx,
  userAnswer,
  isStarred,
  isReviewed,
  isRevealed,
  onSelectOption,
  onToggleStar,
  onToggleReview,
  onToggleReveal,
  onCopy,
  onCapture,
  onReport,
  onFullscreenImage
}: CardProps) {
  
  const choicesEntries = Object.entries(question.choices).filter(([_, val]) => !!val);
  const isCorrect = userAnswer === question.correctAnswer;
  const showDetailedSolution = isRevealed || userAnswer !== undefined;

  // Render original source nicely
  const getSourceBadge = (src: string) => {
    switch (src) {
      case 'uh-butler':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'examveda':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'oxford':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  return (
    <div 
      id={`question-card-${question.id}`}
      className={`bg-white border ${
        userAnswer 
          ? isCorrect 
            ? 'border-emerald-500/50 shadow-md shadow-emerald-500/[0.02]' 
            : 'border-rose-500/50 shadow-md shadow-rose-500/[0.02]' 
          : 'border-slate-200'
      } rounded-3xl p-5 md:p-6 transition-all flex flex-col gap-4 shadow-sm relative group`}
    >
      {/* CARD HEADER METADATA */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 uppercase">
            {question.id.toUpperCase()}
          </span>
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-lg">
            {question.category}
          </span>
          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md uppercase tracking-wider ${getSourceBadge(question.source)}`}>
            {question.source.replace('-butler', '')}
          </span>
        </div>

        {/* TOP Action Pin buttons */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-40 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={() => onToggleStar(question.id)}
            title="Star Question"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-all active:scale-95"
          >
            <Star className={`h-4.5 w-4.5 ${isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>
          <button
            onClick={() => onToggleReview(question.id)}
            title="Bookmark for Review"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-500 transition-all active:scale-95"
          >
            <Bookmark className={`h-4.5 w-4.5 ${isReviewed ? 'fill-indigo-400 text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* QUESTION TEXT */}
      <div className="flex-1">
        <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
          Ch{question.chapterNum}: {question.chapterTitle}
        </div>
        <h3 className="text-[15px] font-bold text-slate-900 leading-relaxed font-sans pr-4">
          {question.text}
        </h3>
      </div>

      {/* QUESTION FIGURES / TABLES (IF ANY) */}
      {question.imageUrl && (
        <div className="my-2 border border-slate-200 rounded-2xl overflow-hidden relative group/img bg-slate-50 flex items-center justify-center max-h-56">
          <img
            src={getProxiedImageUrl(question.imageUrl)}
            alt="Question Geologic Figure"
            className="max-h-52 object-contain py-2 px-4 transition-transform duration-300 group-hover/img:scale-[1.02]"
            referrerPolicy="no-referrer"
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all">
            <button
              onClick={() => onFullscreenImage(question.imageUrl!)}
              className="bg-white/95 text-slate-900 py-2 px-4 rounded-xl text-xs font-bold shadow-xl flex items-center gap-1.5 hover:bg-white active:scale-95 transition-all"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Analyze Figure (Fullscreen Zoom)
            </button>
          </div>
        </div>
      )}

      {question.tableHtml && (
        <div 
          className="my-3 overflow-x-auto border border-slate-200 rounded-2xl bg-white p-4 max-w-full shadow-inner geology-table"
          dangerouslySetInnerHTML={{ __html: question.tableHtml }}
        />
      )}

      {/* CHOICES list */}
      <div className="flex flex-col gap-2 my-2">
        {choicesEntries.map(([key, value]) => {
          const isSelected = userAnswer === key;
          const isCorrectChoice = question.correctAnswer === key;
          const showAsCorrect = showDetailedSolution && isCorrectChoice;
          const showAsIncorrect = showDetailedSolution && isSelected && !isCorrect;

          let btnClass = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 hover:translate-x-1 hover:shadow-sm';
          if (isSelected) {
            btnClass = 'border-slate-800 bg-slate-900 text-white shadow-sm';
          }
          if (showAsCorrect) {
            btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold shadow-sm shadow-emerald-500/5';
          } else if (showAsIncorrect) {
            btnClass = 'border-rose-300 bg-rose-50 text-rose-900 shadow-sm shadow-rose-500/5';
          }

          return (
            <button
              key={key}
              onClick={() => onSelectOption(question.id, key)}
              className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left text-sm transition-all duration-200 ease-out ${btnClass}`}
            >
              <span className={`h-5 w-5 rounded-lg border flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                isSelected 
                  ? 'bg-white text-slate-900 border-white' 
                  : showAsCorrect 
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : showAsIncorrect
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'border-slate-200 text-slate-400 bg-slate-50'
              }`}>
                {key}
              </span>
              <span className="flex-1 pt-0.5 leading-snug">{value}</span>
              {showAsCorrect && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 self-center" />}
              {showAsIncorrect && <XCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 self-center" />}
            </button>
          );
        })}
      </div>

      {/* INTERACTIVE ACTIONS BAR (CARD-ACTIONS) */}
      <div className="card-actions flex items-center justify-between gap-2 pt-3 border-t border-slate-100 mt-2 flex-wrap text-xs text-slate-500 font-bold">
        <button
          onClick={() => onToggleReveal(question.id)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all active:scale-95"
        >
          {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {isRevealed ? 'Hide Answer' : 'Reveal Answer'}
        </button>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => onCopy(question)}
            title="Copy question text"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 active:scale-95 transition-all"
          >
            <Clipboard className="h-4 w-4" />
          </button>
          <button
            onClick={() => onCapture(question.id)}
            title="Export card as PNG image"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 active:scale-95 transition-all"
          >
            <Camera className="h-4 w-4" />
          </button>
          <button
            onClick={() => onReport(question)}
            title="Report an issue / correction"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600 active:scale-95 transition-all"
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
