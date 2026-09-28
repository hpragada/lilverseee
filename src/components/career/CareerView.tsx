/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit3,
  Trash2,
  X,
  Award,
  BarChart2,
  Check,
  Cloud,
  Cpu,
  Code,
  Database,
  Globe,
  Sparkles,
} from 'lucide-react';

export type LearningCategory =
  | 'Cloud & DevOps'
  | 'AI & Machine Learning'
  | 'Programming'
  | 'Databases'
  | 'Web Development'
  | 'Other';

export type CourseStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface LearningCourse {
  id: string;
  title: string;
  provider: string;
  category: LearningCategory;
  description: string;
  startDate?: string;
  targetCompletionDate?: string;
  progressPercent: number;
  status: CourseStatus;
  notes?: string;
  url?: string;
  createdAt: number;
}

const CATEGORIES: {
  id: LearningCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'Cloud & DevOps', label: 'Cloud & DevOps', icon: Cloud },
  { id: 'AI & Machine Learning', label: 'AI & Machine Learning', icon: Cpu },
  { id: 'Programming', label: 'Programming', icon: Code },
  { id: 'Databases', label: 'Databases', icon: Database },
  { id: 'Web Development', label: 'Web Development', icon: Globe },
  { id: 'Other', label: 'Other', icon: Sparkles },
];

const INITIAL_COURSES: LearningCourse[] = [
  {
    id: 'course-1',
    title: 'Google Cloud DevOps & Infrastructure Specialization',
    provider: 'Coursera / Google Cloud',
    category: 'Cloud & DevOps',
    description: 'Automating deployments, CI/CD pipelines, and cloud architecture resilience.',
    startDate: '2026-08-01',
    targetCompletionDate: '2026-11-15',
    progressPercent: 65,
    status: 'In Progress',
    notes: 'Focusing on Kubernetes clusters, Terraform scripts, and continuous integration.',
    url: 'https://coursera.org',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'course-2',
    title: 'Deep Learning & Neural Networks Masterclass',
    provider: 'DeepLearning.AI',
    category: 'AI & Machine Learning',
    description: 'Understanding attention mechanisms, transformers, and fine-tuning models.',
    startDate: '2026-09-01',
    targetCompletionDate: '2026-12-01',
    progressPercent: 40,
    status: 'In Progress',
    notes: 'Practicing Python PyTorch implementations for custom embeddings.',
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'course-3',
    title: 'Full-Stack TypeScript & React Architecture',
    provider: 'Frontend Masters',
    category: 'Web Development',
    description: 'Building high-fidelity accessible web apps with modern Vite & Express.',
    startDate: '2026-07-15',
    targetCompletionDate: '2026-10-01',
    progressPercent: 90,
    status: 'In Progress',
    notes: 'Mastering state management, custom hooks, and Tailwind CSS layouts.',
    createdAt: Date.now() - 86400000 * 45,
  },
  {
    id: 'course-4',
    title: 'PostgreSQL Performance & Query Optimization',
    provider: 'Self-Study & Docs',
    category: 'Databases',
    description: 'Indexing strategies, query execution plans, and connection pooling.',
    startDate: '2026-05-10',
    targetCompletionDate: '2026-08-01',
    progressPercent: 100,
    status: 'Completed',
    notes: 'Successfully optimized database query latencies down to sub-10ms.',
    createdAt: Date.now() - 86400000 * 90,
  },
];

export const CareerView: React.FC = () => {
  const [courses, setCourses] = useState<LearningCourse[]>(() => {
    try {
      const saved = localStorage.getItem('mlw_learning_courses');
      if (saved) return JSON.parse(saved);

      // Map legacy career projects if present
      const savedCareer = localStorage.getItem('mlw_career_projects');
      if (savedCareer) {
        const parsedCareer = JSON.parse(savedCareer);
        if (Array.isArray(parsedCareer) && parsedCareer.length > 0) {
          return parsedCareer.map((cp: any, idx: number) => ({
            id: cp.id || `course-legacy-${idx}`,
            title: cp.title || 'Untitled Learning Project',
            provider: 'Self-Study & Career Path',
            category: 'Web Development',
            description: cp.notes || 'Legacy career project.',
            targetCompletionDate: cp.milestoneDate || 'Ongoing',
            progressPercent: cp.status === 'Completed' ? 100 : 50,
            status: cp.status === 'Completed' ? 'Completed' : 'In Progress',
            notes: cp.notes || '',
            createdAt: Date.now() - idx * 86400000,
          }));
        }
      }
      return INITIAL_COURSES;
    } catch {
      return INITIAL_COURSES;
    }
  });

  // Save courses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mlw_learning_courses', JSON.stringify(courses));
    } catch (err) {
      console.warn('Failed to save learning courses:', err);
    }
  }, [courses]);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formCategory, setFormCategory] = useState<LearningCategory>('Cloud & DevOps');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formProgress, setFormProgress] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<CourseStatus>('In Progress');
  const [formNotes, setFormNotes] = useState('');
  const [formUrl, setFormUrl] = useState('');

  // Delete Confirm State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (activeTab === 'active' && c.status === 'Completed') return false;
      if (activeTab === 'completed' && c.status !== 'Completed') return false;
      if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesProvider = c.provider.toLowerCase().includes(q);
        const matchesDesc = c.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesProvider && !matchesDesc) return false;
      }
      return true;
    });
  }, [courses, activeTab, selectedCategory, searchQuery]);

  // Counts
  const activeCount = useMemo(() => courses.filter((c) => c.status !== 'Completed').length, [courses]);
  const completedCount = useMemo(() => courses.filter((c) => c.status === 'Completed').length, [courses]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormTitle('');
    setFormProvider('');
    setFormCategory('Cloud & DevOps');
    setFormDescription('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormTargetDate('');
    setFormProgress(0);
    setFormStatus('In Progress');
    setFormNotes('');
    setFormUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: LearningCourse) => {
    setEditingId(c.id);
    setFormTitle(c.title);
    setFormProvider(c.provider);
    setFormCategory(c.category);
    setFormDescription(c.description);
    setFormStartDate(c.startDate || '');
    setFormTargetDate(c.targetCompletionDate || '');
    setFormProgress(c.progressPercent);
    setFormStatus(c.status);
    setFormNotes(c.notes || '');
    setFormUrl(c.url || '');
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingId) {
      setCourses((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                title: formTitle.trim(),
                provider: formProvider.trim() || 'Self-Study',
                category: formCategory,
                description: formDescription.trim(),
                startDate: formStartDate || undefined,
                targetCompletionDate: formTargetDate || undefined,
                progressPercent: formProgress,
                status: formProgress === 100 ? 'Completed' : formStatus,
                notes: formNotes.trim() || undefined,
                url: formUrl.trim() || undefined,
              }
            : item
        )
      );
    } else {
      const newCourse: LearningCourse = {
        id: `course-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: formTitle.trim(),
        provider: formProvider.trim() || 'Self-Study',
        category: formCategory,
        description: formDescription.trim(),
        startDate: formStartDate || undefined,
        targetCompletionDate: formTargetDate || undefined,
        progressPercent: formProgress,
        status: formProgress === 100 ? 'Completed' : formStatus,
        notes: formNotes.trim() || undefined,
        url: formUrl.trim() || undefined,
        createdAt: Date.now(),
      };
      setCourses((prev) => [newCourse, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 animate-in fade-in duration-300 select-none">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#0D0D0D] border border-[#292929] shadow-lg backdrop-blur-md">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#141414] border border-[#292929] flex items-center justify-center text-[#C0C0C0]">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-base sm:text-lg font-normal text-[#F5F5F5] tracking-tight">
              Learning Hub
            </h1>
            <Sparkles className="w-3.5 h-3.5 text-[#C0C0C0]" />
          </div>
          <p className="text-xs text-[#999999] font-light">
            Track active skills, courses, study goals, and vocation milestones.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="px-2.5 py-1 rounded-xl bg-[#111111] border border-[#292929] text-[11px] text-[#999999] font-light">
            <span className="font-medium text-[#F5F5F5]">{activeCount}</span> in progress · <span className="font-medium text-emerald-400">{completedCount}</span> mastered
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-xl silver-btn-primary text-black text-xs font-medium flex items-center gap-1.5 shadow-sm hover:scale-102 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0D0D0D] border border-[#292929] backdrop-blur-md">
        {/* Active vs Completed Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'silver-btn-primary text-black font-medium shadow-sm'
                : 'bg-[#141414] text-[#999999] hover:text-[#F5F5F5] border border-[#292929]'
            }`}
          >
            All ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'silver-btn-primary text-black font-medium shadow-sm'
                : 'bg-[#141414] text-[#999999] hover:text-[#F5F5F5] border border-[#292929]'
            }`}
          >
            In Progress ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'silver-btn-primary text-black font-medium shadow-sm'
                : 'bg-[#141414] text-[#999999] hover:text-[#F5F5F5] border border-[#292929]'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-[#999999] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#141414] border border-[#292929] rounded-xl px-2.5 py-1 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0] cursor-pointer"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Course Library Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-[#0D0D0D] border border-[#292929] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#292929] flex items-center justify-center text-[#C0C0C0] mx-auto">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-normal text-[#F5F5F5]">No learning courses found</h3>
          <p className="text-xs text-[#999999] font-light max-w-sm mx-auto">
            There are no courses matching your current filters. Tap "Add Course" above to create one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredCourses.map((course) => {
            const CatIcon =
              CATEGORIES.find((c) => c.id === course.category)?.icon || Sparkles;
            const isCompleted = course.status === 'Completed';

            return (
              <div
                key={course.id}
                className="p-4 rounded-2xl bg-[#0D0D0D] border border-[#292929] hover:border-[#C0C0C0]/40 transition-all duration-300 space-y-3 shadow-sm flex flex-col justify-between backdrop-blur-md"
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Category & Status Badge */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-light text-[#C0C0C0] flex items-center gap-1.5">
                      <CatIcon className="w-3.5 h-3.5 text-[#C0C0C0]" />
                      <span>{course.category}</span>
                    </span>

                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full border font-light ${
                        isCompleted
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                          : course.status === 'In Progress'
                          ? 'bg-[#141414] border-[#C0C0C0]/40 text-[#C0C0C0]'
                          : 'bg-[#141414] border-[#292929] text-[#999999]'
                      }`}
                    >
                      {course.status}
                    </span>
                  </div>

                  {/* Title & Provider */}
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-normal text-[#F5F5F5] tracking-tight">
                      {course.title}
                    </h3>
                    <div className="text-[11px] text-[#999999] font-light flex items-center gap-1.5">
                      <span>Provider: {course.provider}</span>
                      {course.url && (
                        <a
                          href={course.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-0.5 text-[10px] text-[#C0C0C0]"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {course.description && (
                    <p className="text-xs text-[#999999] font-light leading-relaxed line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  {/* Personal Study Notes */}
                  {course.notes && (
                    <div className="p-2.5 rounded-xl bg-[#141414] border border-[#292929] text-[11px] text-[#999999] font-light italic">
                      💡 "{course.notes}"
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 pt-2.5 border-t border-[#292929]">
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#999999] font-light">
                      <span>Progress</span>
                      <span className="text-[#F5F5F5] font-mono">{course.progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#141414] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#C0C0C0] to-[#E8E8E8]'
                        }`}
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates & Actions */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <div className="text-[10px] text-[#999999] font-light">
                      {course.targetCompletionDate && (
                        <span>Target: {course.targetCompletionDate}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(course)}
                        className="p-1 rounded-lg text-[#999999] hover:text-[#F5F5F5] hover:bg-[#141414] transition-colors cursor-pointer"
                        title="Edit course"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#C0C0C0]" />
                      </button>

                      {confirmDeleteId === course.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              handleDeleteCourse(course.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-200 text-[10px] cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] text-[#999999] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(course.id)}
                          className="p-1.5 rounded-lg text-[#999999] hover:text-rose-400 hover:bg-[#141414] cursor-pointer"
                          title="Delete course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveForm}
            className="relative w-full max-w-lg bg-[#0D0D0D] border border-[#292929] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#C0C0C0]" />
                <h3 className="text-sm font-normal text-[#F5F5F5]">
                  {editingId ? 'Edit Course / Skill' : 'Add Course / Skill'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#141414] border border-[#292929] flex items-center justify-center text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Course Title</label>
                <input
                  type="text"
                  placeholder="e.g. Google Cloud DevOps & Infrastructure..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#999999] block mb-1">Provider</label>
                  <input
                    type="text"
                    placeholder="e.g. Coursera, Udemy, YouTube..."
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#999999] block mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as LearningCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="What key skills or concepts does this course cover?"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#999999] block mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as CourseStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#999999] block mb-1">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formProgress}
                    onChange={(e) => setFormProgress(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#999999] block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#999999] block mb-1">Target Completion</label>
                  <input
                    type="text"
                    placeholder="e.g. Dec 2026, Autumn..."
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Personal Notes / Thoughts</label>
                <input
                  type="text"
                  placeholder="e.g. Finish Chapter 4 by Friday..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#999999] block mb-1">Course URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#292929] text-xs text-[#F5F5F5] placeholder-[#999999]/60 focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#292929] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#111111] hover:bg-[#1A1A1A] border border-[#292929] text-xs font-light text-[#999999] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl silver-btn-primary text-black text-xs font-medium cursor-pointer shadow-sm"
              >
                Save Course
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
