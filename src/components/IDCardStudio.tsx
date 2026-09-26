import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Learner, SchoolSettings } from '../types';
import { 
  CreditCard, 
  Printer, 
  Download, 
  Filter, 
  Eye, 
  Sparkles, 
  Check, 
  Phone,
  ShieldCheck
} from 'lucide-react';

interface IDCardStudioProps {
  learners: Learner[];
  settings: SchoolSettings;
  selectedLearnerId?: string;
}

export const IDCardStudio: React.FC<IDCardStudioProps> = ({
  learners,
  settings,
  selectedLearnerId
}) => {
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [activeLearnerId, setActiveLearnerId] = useState<string>(
    selectedLearnerId || (learners[0]?.id ?? '')
  );
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});

  const grades = Array.from(new Set(learners.map(l => l.grade))).sort();
  const sections = Array.from(new Set(learners.map(l => l.section))).sort();

  const filteredLearners = learners.filter(l => {
    const matchGrade = selectedGrade === 'All' || l.grade === selectedGrade;
    const matchSection = selectedSection === 'All' || l.section === selectedSection;
    return matchGrade && matchSection;
  });

  const activeLearner = learners.find(l => l.id === activeLearnerId) || filteredLearners[0] || learners[0];

  // Generate QR code data URLs for learners
  useEffect(() => {
    const generateQRs = async () => {
      const urls: Record<string, string> = {};
      for (const learner of learners) {
        try {
          const payload = JSON.stringify({
            sircam: true,
            id: learner.id,
            lrn: learner.lrn,
            name: `${learner.firstName} ${learner.lastName}`,
            grade: learner.grade,
            section: learner.section
          });
          const dataUrl = await QRCode.toDataURL(payload, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 300,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            }
          });
          urls[learner.id] = dataUrl;
        } catch (e) {
          console.error('QR gen error:', e);
        }
      }
      setQrCodeDataUrls(urls);
    };

    generateQRs();
  }, [learners]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Card (Hidden on Print) */}
      <div className="print:hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" /> Auto-Generated QR ID Badges
            </h2>
            <p className="text-xs text-slate-400">
              Generate, preview, and print official Philippine DepEd-styled scannable student ID cards
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Single Card View
              </button>
              <button
                onClick={() => setViewMode('batch')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'batch'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Batch Print Sheet ({filteredLearners.length})
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print {viewMode === 'batch' ? 'All Cards' : 'Card'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="All">All Grades</option>
            {grades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="All">All Sections</option>
            {sections.map(s => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>

          {viewMode === 'single' && (
            <select
              value={activeLearnerId}
              onChange={(e) => setActiveLearnerId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none max-w-[240px]"
            >
              {filteredLearners.map(l => (
                <option key={l.id} value={l.id}>
                  {l.lastName}, {l.firstName} ({l.lrn})
                </option>
              ))}
            </select>
          )}

          <span className="text-xs text-slate-400 ml-auto">
            {filteredLearners.length} student cards ready
          </span>
        </div>
      </div>

      {/* SINGLE CARD PREVIEW */}
      {viewMode === 'single' && activeLearner && (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 border border-slate-800 rounded-2xl min-h-[460px]">
          {/* Card Wrapper */}
          <div className="w-[340px] bg-white text-slate-900 rounded-2xl shadow-2xl border-2 border-blue-600/30 overflow-hidden relative font-sans flex flex-col justify-between">
            {/* Top DepEd Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-3 text-center border-b-2 border-amber-400">
              <p className="text-[9px] uppercase tracking-wider font-semibold opacity-90">
                Republic of the Philippines • DepEd
              </p>
              <h3 className="text-xs font-black tracking-tight uppercase">
                {settings.schoolName}
              </h3>
              <p className="text-[8px] text-blue-200 uppercase tracking-widest">
                Official Student Identification Card • S.Y. {settings.academicYear}
              </p>
            </div>

            {/* Middle Profile & QR Content */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                {activeLearner.photoUrl ? (
                  <img
                    src={activeLearner.photoUrl}
                    alt={activeLearner.firstName}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-blue-600 shadow shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-blue-100 text-blue-800 border-2 border-blue-600 flex items-center justify-center font-bold text-2xl shrink-0">
                    {activeLearner.firstName[0]}
                    {activeLearner.lastName[0]}
                  </div>
                )}

                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 inline-block mb-0.5">
                    {activeLearner.grade}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 leading-tight">
                    {activeLearner.firstName} {activeLearner.middleName ? `${activeLearner.middleName[0]}. ` : ''}{activeLearner.lastName} {activeLearner.suffix || ''}
                  </h4>
                  <p className="text-[11px] font-bold text-blue-700">
                    Section: {activeLearner.section}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Sex: <strong className="text-slate-700">{activeLearner.sex}</strong>
                  </p>
                </div>
              </div>

              {/* LRN Callout */}
              <div className="bg-slate-100 p-2 rounded-xl text-center border border-slate-200">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
                  Learner Reference Number (LRN)
                </span>
                <span className="text-base font-black font-mono tracking-wider text-blue-900">
                  {activeLearner.lrn}
                </span>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center py-1">
                {qrCodeDataUrls[activeLearner.id] ? (
                  <img
                    src={qrCodeDataUrls[activeLearner.id]}
                    alt={`QR Code for ${activeLearner.lrn}`}
                    className="w-32 h-32 rounded-lg border border-slate-300 shadow-sm"
                  />
                ) : (
                  <div className="w-32 h-32 bg-slate-100 rounded-lg animate-pulse" />
                )}
                <span className="text-[8px] font-semibold tracking-wider text-slate-400 mt-1 uppercase">
                  Scan for Time-In / Time-Out
                </span>
              </div>

              {/* Emergency Parent Contact */}
              <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
                <div>
                  <span className="block text-[8px] uppercase font-bold text-slate-400">Emergency Contact:</span>
                  <strong className="text-slate-800">{activeLearner.parentName}</strong>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-blue-700 flex items-center gap-1 justify-end">
                    <Phone className="w-2.5 h-2.5" /> {activeLearner.parentContact}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Footer Barcode & Security */}
            <div className="bg-slate-900 text-white px-3 py-2 text-[9px] flex items-center justify-between border-t border-slate-800">
              <span className="flex items-center gap-1 text-teal-400 font-semibold text-[8px]">
                <ShieldCheck className="w-3 h-3" /> SIRCAM SECURE ID
              </span>
              <span className="font-mono text-[9px] text-slate-300">
                ID: {activeLearner.id}
              </span>
            </div>
          </div>

          <div className="print:hidden mt-5 text-center text-xs text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5 justify-center text-teal-400 font-semibold">
              <Sparkles className="w-4 h-4" /> Ready for High-Resolution Printing &amp; Lamination
            </p>
            <p>Compatible with any phone camera, tablet kiosk, or physical 2D barcode scanner.</p>
          </div>
        </div>
      )}

      {/* BATCH PRINT SHEET (GRID OF 8 CARDS PER PAGE READY FOR PRINT) */}
      {viewMode === 'batch' && (
        <div className="space-y-4">
          <div className="print:hidden bg-blue-950/30 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-300 flex items-center justify-between">
            <span>
              Formatted for 8 cards per page with cut-lines. Click <strong>Print All Cards</strong> or press Ctrl+P to print.
            </span>
            <button
              onClick={handlePrint}
              className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print Sheet
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-3">
            {filteredLearners.map(learner => (
              <div
                key={learner.id}
                className="w-full bg-white text-slate-900 rounded-xl shadow-md border border-slate-300 overflow-hidden flex flex-col justify-between text-xs print:break-inside-avoid print:shadow-none print:border-dashed"
              >
                {/* Header */}
                <div className="bg-blue-900 text-white p-2 text-center border-b border-amber-400">
                  <p className="text-[7px] uppercase font-bold tracking-wider">
                    DepEd • {settings.schoolName}
                  </p>
                  <p className="text-[8px] font-black uppercase text-amber-300">
                    Official Student ID
                  </p>
                </div>

                {/* Body */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {learner.photoUrl ? (
                      <img
                        src={learner.photoUrl}
                        alt={learner.firstName}
                        className="w-14 h-14 rounded-lg object-cover border border-blue-600 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-blue-100 text-blue-800 border border-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                        {learner.firstName[0]}{learner.lastName[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-xs truncate">
                        {learner.firstName} {learner.lastName}
                      </p>
                      <p className="text-[10px] text-blue-700 font-bold">
                        {learner.grade} - {learner.section}
                      </p>
                      <p className="text-[9px] font-mono text-slate-600">
                        LRN: {learner.lrn}
                      </p>
                    </div>
                  </div>

                  {/* QR Image */}
                  <div className="flex justify-center py-1">
                    {qrCodeDataUrls[learner.id] && (
                      <img
                        src={qrCodeDataUrls[learner.id]}
                        alt={learner.lrn}
                        className="w-24 h-24 rounded border border-slate-300"
                      />
                    )}
                  </div>

                  <div className="text-[8px] text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                    <span>Parent: {learner.parentName}</span>
                    <span className="font-mono font-bold text-slate-700">{learner.parentContact}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-900 text-white px-2 py-1 text-[7px] flex justify-between font-mono">
                  <span>SIRCAM ID</span>
                  <span>{learner.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
