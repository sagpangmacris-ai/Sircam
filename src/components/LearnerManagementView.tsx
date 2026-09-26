import React, { useState } from 'react';
import { Learner, Sex } from '../types';
import { exportLearnersMasterlistCsv } from '../lib/exportUtils';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  QrCode, 
  Download, 
  Check, 
  X, 
  AlertCircle,
  Phone,
  MessageCircle,
  Eye
} from 'lucide-react';

interface LearnerManagementViewProps {
  learners: Learner[];
  onSaveLearner: (learner: Learner) => void;
  onDeleteLearner: (id: string) => void;
  onOpenIdBadge: (learner: Learner) => void;
}

export const LearnerManagementView: React.FC<LearnerManagementViewProps> = ({
  learners,
  onSaveLearner,
  onDeleteLearner,
  onOpenIdBadge
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [sexFilter, setSexFilter] = useState('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Learner | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    id: '',
    lrn: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    sex: 'Male' as Sex,
    grade: 'Grade 10',
    section: 'Rizal',
    parentName: '',
    parentContact: '',
    parentMessengerId: '',
    photoUrl: '',
    address: '',
    status: 'Active' as Learner['status']
  });
  const [validationError, setValidationError] = useState('');

  const grades = Array.from(new Set(learners.map(l => l.grade))).sort();
  const sections = Array.from(new Set(learners.map(l => l.section))).sort();

  const filteredLearners = learners.filter(l => {
    const matchGrade = gradeFilter === 'All' || l.grade === gradeFilter;
    const matchSection = sectionFilter === 'All' || l.section === sectionFilter;
    const matchSex = sexFilter === 'All' || l.sex === sexFilter;
    const matchSearch =
      searchQuery === '' ||
      l.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.lrn.includes(searchQuery) ||
      l.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchGrade && matchSection && matchSex && matchSearch;
  });

  const handleOpenAddModal = () => {
    const nextSeq = learners.length + 1;
    const autoId = `lrn-2026-${String(nextSeq).padStart(3, '0')}`;
    const autoLrn = `10928374${String(6500 + nextSeq)}`;

    setEditingLearner(null);
    setFormData({
      id: autoId,
      lrn: autoLrn,
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      sex: 'Male',
      grade: 'Grade 10',
      section: 'Rizal',
      parentName: '',
      parentContact: '09',
      parentMessengerId: '',
      photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces',
      address: '',
      status: 'Active'
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (learner: Learner) => {
    setEditingLearner(learner);
    setFormData({
      id: learner.id,
      lrn: learner.lrn,
      firstName: learner.firstName,
      middleName: learner.middleName || '',
      lastName: learner.lastName,
      suffix: learner.suffix || '',
      sex: learner.sex,
      grade: learner.grade,
      section: learner.section,
      parentName: learner.parentName,
      parentContact: learner.parentContact,
      parentMessengerId: learner.parentMessengerId,
      photoUrl: learner.photoUrl || '',
      address: learner.address || '',
      status: learner.status
    });
    setValidationError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: 12-digit DepEd LRN check
    const cleanLrn = formData.lrn.trim();
    if (!/^\d{12}$/.test(cleanLrn)) {
      setValidationError('DepEd LRN must be exactly 12 numeric digits (e.g. 109283746501).');
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setValidationError('First Name and Last Name are required.');
      return;
    }

    if (!formData.parentContact.trim()) {
      setValidationError('Parent Contact Number is required for SMS alerts.');
      return;
    }

    // Check duplicate LRN
    const isDuplicate = learners.some(
      l => l.lrn === cleanLrn && (!editingLearner || l.id !== editingLearner.id)
    );
    if (isDuplicate) {
      setValidationError(`LRN ${cleanLrn} is already assigned to another learner.`);
      return;
    }

    const learnerToSave: Learner = {
      id: formData.id || `lrn-2026-${Date.now().toString().slice(-4)}`,
      lrn: cleanLrn,
      firstName: formData.firstName.trim(),
      middleName: formData.middleName.trim() || undefined,
      lastName: formData.lastName.trim(),
      suffix: formData.suffix.trim() || undefined,
      sex: formData.sex,
      grade: formData.grade,
      section: formData.section,
      parentName: formData.parentName.trim() || `${formData.lastName} Guardian`,
      parentContact: formData.parentContact.trim(),
      parentMessengerId: formData.parentMessengerId.trim(),
      photoUrl: formData.photoUrl.trim() || undefined,
      address: formData.address.trim() || undefined,
      enrolledAt: editingLearner?.enrolledAt || new Date().toISOString().split('T')[0],
      status: formData.status
    };

    onSaveLearner(learnerToSave);
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDeleteLearner(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Learner Directory &amp; Records
            </h2>
            <p className="text-xs text-slate-400">
              Manage student profile records, 12-digit LRNs, contact information, and QR badges
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportLearnersMasterlistCsv(learners)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Export Learner Masterlist to CSV"
            >
              <Download className="w-4 h-4" /> Export Masterlist
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
            >
              <UserPlus className="w-4 h-4" /> Enroll New Learner
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, LRN, or Learner ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg pl-9 pr-3 py-2 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="All">All Grades</option>
            {grades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="All">All Sections</option>
            {sections.map(s => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>

          <select
            value={sexFilter}
            onChange={(e) => setSexFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="All">All Sex</option>
            <option value="Male">Male (Boys)</option>
            <option value="Female">Female (Girls)</option>
          </select>

          <span className="text-xs text-slate-400 px-2 py-1 bg-slate-800 rounded-lg">
            Showing {filteredLearners.length} of {learners.length}
          </span>
        </div>
      </div>

      {/* Learners Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Learner Profile</th>
                <th className="py-3.5 px-3">12-Digit LRN</th>
                <th className="py-3.5 px-3">Grade &amp; Section</th>
                <th className="py-3.5 px-3">Sex</th>
                <th className="py-3.5 px-3">Parent / Guardian</th>
                <th className="py-3.5 px-3">Alert Channels</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No learners found matching the search or filters.
                  </td>
                </tr>
              ) : (
                filteredLearners.map(learner => (
                  <tr key={learner.id} className="hover:bg-slate-800/40 transition">
                    {/* Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {learner.photoUrl ? (
                          <img
                            src={learner.photoUrl}
                            alt={learner.firstName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                            {learner.firstName[0]}
                            {learner.lastName[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-100">
                            {learner.lastName}, {learner.firstName} {learner.middleName ? `${learner.middleName[0]}.` : ''} {learner.suffix || ''}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            ID: {learner.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 12-Digit LRN */}
                    <td className="py-3 px-3">
                      <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                        {learner.lrn}
                      </span>
                    </td>

                    {/* Grade & Section */}
                    <td className="py-3 px-3">
                      <span className="text-slate-200 font-medium">{learner.grade}</span>
                      <span className="block text-[11px] text-slate-400">{learner.section}</span>
                    </td>

                    {/* Sex */}
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          learner.sex === 'Male'
                            ? 'bg-blue-500/10 text-blue-300'
                            : 'bg-pink-500/10 text-pink-300'
                        }`}
                      >
                        {learner.sex}
                      </span>
                    </td>

                    {/* Parent */}
                    <td className="py-3 px-3">
                      <p className="text-slate-200 font-medium">{learner.parentName}</p>
                      <p className="text-[11px] text-slate-400">{learner.address || 'Local Resident'}</p>
                    </td>

                    {/* Alert Channels */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span className="font-mono">{learner.parentContact}</span>
                        </div>
                        {learner.parentMessengerId && (
                          <div className="flex items-center gap-1.5 text-[11px] text-indigo-300">
                            <MessageCircle className="w-3 h-3 text-indigo-400" />
                            <span className="truncate max-w-[120px]">{learner.parentMessengerId}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View QR Card */}
                        <button
                          onClick={() => onOpenIdBadge(learner)}
                          className="p-1.5 rounded-lg bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 transition"
                          title="Generate & View QR ID Badge"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEditModal(learner)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition"
                          title="Edit Profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(learner)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
                          title="Remove Learner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Learner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingLearner ? 'Edit Learner Profile' : 'Enroll New Learner'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    12-Digit LRN (Learner Ref. No.) *
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="109283746501"
                    value={formData.lrn}
                    onChange={(e) => setFormData({ ...formData, lrn: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                  <span className="text-[10px] text-slate-500">Official DepEd 12-digit number</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Learner ID (System Ref)
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Suffix, Sex, Grade, Section */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Suffix</label>
                  <input
                    type="text"
                    placeholder="Jr., III, etc."
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sex *</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value as Sex })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Grade Level</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Section</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Parent Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Parent Mobile (for SMS) *</label>
                  <input
                    type="text"
                    placeholder="09171234567"
                    value={formData.parentContact}
                    onChange={(e) => setFormData({ ...formData, parentContact: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Parent Messenger ID</label>
                  <input
                    type="text"
                    placeholder="e.g. maria.santos"
                    value={formData.parentMessengerId}
                    onChange={(e) => setFormData({ ...formData, parentMessengerId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Photo & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Photo / Avatar Image URL</label>
                  <input
                    type="url"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Home Address / Barangay</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
                >
                  {editingLearner ? 'Save Changes' : 'Enroll Learner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" /> Confirm Learner Removal
            </h3>
            <p className="text-slate-300">
              Are you sure you want to remove learner{' '}
              <strong className="text-white">
                {deleteTarget.firstName} {deleteTarget.lastName}
              </strong>{' '}
              (LRN: <span className="font-mono text-blue-400">{deleteTarget.lrn}</span>)?
            </p>
            <p className="text-slate-500">
              This will remove their profile and deactivate their QR badge.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md"
              >
                Delete Learner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
