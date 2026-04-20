/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Phone, Mail, MapPin, User, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence, useScroll } from 'motion/react';
import Papa from 'papaparse';

// Constants
const SHEET_1_URL = 'https://docs.google.com/spreadsheets/d/1jkkS-JvkocWGYBD3bwNZlzDcWfyrvSgX/export?format=csv';
const SHEET_2_URL = 'https://docs.google.com/spreadsheets/d/1qLNYNyIl9eg-v26jyrPxmcCDG3C2fGBT/export?format=csv';

interface Official {
  id: string;
  category: 'Administration' | 'Constituency';
  designation: string;
  name?: string;
  mobile: string;
  email?: string;
  constituency?: string;
}

export default function App() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Administration' | 'Constituency'>('All');
  const [constituencyFilter, setConstituencyFilter] = useState<string>('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        fetch(SHEET_1_URL).then(r => r.text()),
        fetch(SHEET_2_URL).then(r => r.text())
      ]);

      const data1 = Papa.parse(res1, { header: true }).data as any[];
      const data2 = Papa.parse(res2, { header: true }).data as any[];

      const combined: Official[] = [
        ...data1.filter(row => row.Designation).map((row, i) => ({
          id: `admin-${i}`,
          category: 'Administration' as const,
          designation: row.Designation,
          mobile: row['Mobile No'],
          email: row['e.mail']
        })),
        ...data2.filter(row => row.Name).map((row, i) => ({
          id: `const-${i}`,
          category: 'Constituency' as const,
          designation: row['RO/ARO'],
          name: row.Name,
          mobile: row['Mobile No'],
          constituency: row['Assembly Constituency']
        }))
      ];

      setOfficials(combined);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const allConstituencies = useMemo(() => {
    const list = officials
      .map(o => o.constituency)
      .filter((c): c is string => !!c);
    return Array.from(new Set(list)).sort();
  }, [officials]);

  const filteredOfficials = useMemo(() => {
    return officials.filter(off => {
      const matchesSearch = 
        (off.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        off.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        off.mobile.includes(searchQuery) ||
        (off.constituency?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'All' || off.category === categoryFilter;
      const matchesConstituency = constituencyFilter === 'All' || off.constituency === constituencyFilter;
      
      return matchesSearch && matchesCategory && matchesConstituency;
    });
  }, [officials, searchQuery, categoryFilter, constituencyFilter]);

  const adminOfficials = useMemo(() => {
    return filteredOfficials.filter(off => off.category === 'Administration');
  }, [filteredOfficials]);

  const constituencyOfficials = useMemo(() => {
    return filteredOfficials.filter(off => off.category === 'Constituency');
  }, [filteredOfficials]);

  const constituencyGroups = useMemo<Record<string, Official[]>>(() => {
    const groups: Record<string, Official[]> = {};
    constituencyOfficials.forEach(off => {
      const key = off.constituency || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(off);
    });
    return groups;
  }, [constituencyOfficials]);

  return (
    <div className="min-h-screen soft-mesh text-slate-900 font-sans selection:bg-green-100">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-green-600 z-[100] origin-left"
        style={{ scaleX: useScroll().scrollYProgress }}
      />

      {/* Header Section */}
      <header className="sticky top-0 z-50 glass-header shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                <User className="w-3 h-3" />
                Tenkasi District
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                Official Directory
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                District Administration & Election Constituency Officers
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchData}
                className="p-2 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, designation, or constituency..."
                className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all text-sm outline-none shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex bg-slate-100 p-1 rounded-xl shadow-sm">
                {(['All', 'Administration', 'Constituency'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategoryFilter(cat);
                      if (cat === 'Administration') setConstituencyFilter('All');
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      categoryFilter === cat 
                        ? 'bg-white text-green-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {(categoryFilter === 'All' || categoryFilter === 'Constituency') && (
                <select
                  value={constituencyFilter}
                  onChange={(e) => setConstituencyFilter(e.target.value)}
                  className="px-4 py-1.5 bg-slate-100 border-none rounded-xl text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-green-500 transition-all cursor-pointer shadow-sm"
                >
                  <option value="All">All Constituencies</option>
                  {allConstituencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              {(categoryFilter !== 'All' || constituencyFilter !== 'All' || searchQuery !== '') && (
                <button
                  onClick={() => {
                    setCategoryFilter('All');
                    setConstituencyFilter('All');
                    setSearchQuery('');
                  }}
                  className="px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-all shadow-sm"
                >
                  Reset All
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 grayscale">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-500 font-medium">Fetching the latest records...</p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Administration Section */}
            {(adminOfficials.length > 0 || !searchQuery) && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">District Administration</h2>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">DEO, DRO & Special Officers</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {adminOfficials.map((off, idx) => (
                      <OfficialCard key={off.id} official={off} index={idx} />
                    ))}
                  </AnimatePresence>
                </div>
                {adminOfficials.length === 0 && searchQuery && (
                  <p className="text-slate-400 text-sm italic py-4">No administration results match your search.</p>
                )}
              </section>
            )}

            {/* Constituency Section */}
            {(constituencyOfficials.length > 0 || !searchQuery) && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Constituency Officers</h2>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">RO & ARO for Assembly Constituencies</p>
                  </div>
                </div>
                
                <div className="space-y-10">
                  {(Object.entries(constituencyGroups) as [string, Official[]][]).sort().map(([cName, members]) => (
                    <div key={cName} className="space-y-4">
                      <div className="flex items-baseline gap-2 border-b border-slate-200 pb-2">
                        <h3 className="text-md font-bold text-green-700">
                          {cName}
                        </h3>
                        {searchQuery && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                            {members.length} Match{members.length !== 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence mode="popLayout">
                          {members.map((off, idx) => (
                            <OfficialCard key={off.id} official={off} index={idx} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>

                {constituencyOfficials.length === 0 && searchQuery && (
                  <p className="text-slate-400 text-sm italic py-4">No constituency results match your search.</p>
                )}
              </section>
            )}

            {adminOfficials.length === 0 && constituencyOfficials.length === 0 && searchQuery && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-bold text-lg">No matches found</h3>
                <p className="text-slate-500 text-sm mt-1">Try adjusting your search terms.</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-6 px-6 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-400">
        <p className="text-xs uppercase tracking-[0.2em] font-medium mb-2">Government of Tamil Nadu</p>
        <p className="text-[10px] max-w-xs mx-auto opacity-60">
          Disclaimer: This directory is provided for informational purposes only. Information is sourced directly from district spreadsheets.
        </p>
      </footer>
    </div>
  );
}

function OfficialCard({ official: off, index = 0 }: { official: Official; index?: number; key?: any }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        delay: index * 0.05,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl border border-slate-200/50 hover:border-green-300 hover:shadow-[0_20px_50px_rgba(20,83,45,0.1)] transition-all group flex flex-col justify-between ledger-shadow relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2 rounded-xl border ${
            off.category === 'Administration' 
            ? 'bg-green-50 border-green-100 text-green-700' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
          }`}>
            <User className="w-5 h-5" />
          </div>
          <div className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
            off.category === 'Administration' 
            ? 'bg-green-50 text-green-700' 
            : 'bg-emerald-50 text-emerald-700'
          }`}>
            {off.category}
          </div>
        </div>

        <div className="space-y-1 mb-6">
          <h3 className="font-bold text-slate-900 group-hover:text-green-700 transition-colors">
            {off.name || off.designation}
          </h3>
          {off.name && (
            <p className="text-sm font-medium text-slate-500 italic leading-tight">
              {off.designation}
            </p>
          )}
          {off.constituency && (
            <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium mt-2">
              <MapPin className="w-3 h-3" />
              {off.constituency}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4 relative z-10">
        <a 
          href={`tel:${off.mobile}`}
          className="flex items-center gap-3 p-2 bg-slate-50 hover:bg-green-50 rounded-lg group/btn transition-colors"
        >
          <div className="w-8 h-8 flex items-center justify-center bg-white rounded-md border border-slate-200 group-hover/btn:border-green-200">
            <Phone className="w-4 h-4 text-slate-600 group-hover/btn:text-green-700" />
          </div>
          <span className="text-sm font-semibold text-slate-700 group-hover/btn:text-green-800">
            {off.mobile}
          </span>
        </a>
        
        {off.email && (
          <a 
            href={`mailto:${off.email}`}
            className="flex items-center gap-3 p-2 bg-slate-50 hover:bg-green-50 rounded-lg group/btn transition-colors"
          >
            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-md border border-slate-200 group-hover/btn:border-green-200">
              <Mail className="w-4 h-4 text-slate-600 group-hover/btn:text-green-700" />
            </div>
            <span className="text-xs font-medium text-slate-700 break-all group-hover/btn:text-green-800">
              {off.email}
            </span>
          </a>
        )}
      </div>
    </motion.div>
  );
}
