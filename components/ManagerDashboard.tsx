
import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { pocketbaseService } from '../services/pocketbaseService';
import { 
  BarChart3, 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  Car, 
  RefreshCw,
  Search,
  ArrowRight,
  Download,
  Calendar,
  Clock,
  TrendingUp,
  ChevronRight,
  Table as TableIcon,
  Bell,
  Send,
  Loader2,
  Settings,
  Router,
  MessageCircle,
  X
} from 'lucide-react';
import { ConfigTab } from './ConfigTab';
import { Report, ModemSetupReport, Announcement } from '../types';

interface ManagerDashboardProps {
  pocketbaseUrl?: string;
  onUpdateUrl: (url: string) => void;
  onLogout: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ pocketbaseUrl, onUpdateUrl, onLogout }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [modemReports, setModemReports] = useState<ModemSetupReport[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<string>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  // Reply Modal State
  const [replyModal, setReplyModal] = useState<{open: boolean; type: 'report' | 'modem'; id: string; hizmetNo: string} | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  
  // Duyuru Form Durumu
  const [announcementForm, setAnnouncementForm] = useState({ target: 'HEPSİ', title: '', message: '' });
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);

  const fetchData = useCallback(async () => {
    if (!pocketbaseUrl) return;
    setLoading(true);
    try {
      pocketbaseService.initialize(pocketbaseUrl);
      const [reportsData, modemData, announcementsData] = await Promise.all([
        pocketbaseService.getAllReports(),
        pocketbaseService.getModemReports(),
        pocketbaseService.getAnnouncements(),
      ]);
      setReports(reportsData);
      setModemReports(modemData);
      setAnnouncements(announcementsData);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [pocketbaseUrl]);

  useEffect(() => {
    if (pocketbaseUrl) {
      pocketbaseService.initialize(pocketbaseUrl);
      fetchData();
    }
  }, [pocketbaseUrl, fetchData]);

  const handleReply = async () => {
    if (!replyModal || !replyText.trim()) return;
    setIsReplying(true);
    try {
      if (replyModal.type === 'modem') {
        await pocketbaseService.updateModemReportReply(replyModal.id, replyText, 'ADMIN');
        const modemReport = modemReports.find(m => m.id === replyModal.id);
        const targetEkip = modemReport?.ekipKodu || 'HEPSİ';
        setModemReports(prev => prev.map(r =>
          r.id === replyModal.id
            ? { ...r, status: 'replied' as const, reply: replyText, replyAdmin: 'ADMIN', replyTimestamp: new Date().toLocaleString('tr-TR') }
            : r
        ));
        // Send announcement only to the team that submitted the request
        await pocketbaseService.createAnnouncement({
          id: crypto.randomUUID(),
          reportType: 'announcement',
          targetTeam: targetEkip,
          title: `MODEM YANITI - ${replyModal.hizmetNo}`,
          message: `Hizmet No: ${replyModal.hizmetNo}\n\nYanıt: ${replyText}\n\nYanıt Tarihi: ${new Date().toLocaleString('tr-TR')}`,
          sender: 'ADMIN',
          timestamp: new Date().toLocaleString('tr-TR'),
        });
      } else {
        await pocketbaseService.updateReportReply(replyModal.id, replyText, 'ADMIN');
        setReports(prev => prev.map(r =>
          r.id === replyModal.id
            ? { ...r, status: 'replied' as const, reply: replyText, replyAdmin: 'ADMIN', replyTimestamp: new Date().toLocaleString('tr-TR') }
            : r
        ));
      }
      setReplyModal(null);
      setReplyText('');
    } catch (err) {
      console.error("Reply error:", err);
      alert("Yanıt gönderilemedi!");
    } finally {
      setIsReplying(false);
    }
  };

  const sendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pocketbaseUrl) return;
    setIsSendingAnnouncement(true);
    
    const payload: Announcement = {
      id: crypto.randomUUID(),
      reportType: 'announcement',
      targetTeam: announcementForm.target,
      title: announcementForm.title,
      message: announcementForm.message,
      sender: 'ADMIN',
      timestamp: new Date().toLocaleString('tr-TR'),
    };

    try {
      await pocketbaseService.createAnnouncement(payload);
      alert("Duyuru başarıyla gönderildi!");
      setAnnouncementForm({ target: 'HEPSİ', title: '', message: '' });
      fetchData();
    } catch (err) {
      alert("Gönderim hatası!");
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  const downloadExcel = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!pocketbaseUrl) {
    return (
      <div className="mt-10 max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <h3 className="font-black text-slate-900 mb-4 uppercase tracking-tighter">POCKETBASE BAĞLANTISI GEREKLİ</h3>
        <button onClick={onLogout} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs">ÇIKIŞ YAP</button>
      </div>
    );
  }

  const getTeamList = () => {
    const teams = new Set<string>();
    reports.forEach(r => { if (r.ekipKodu) teams.add(r.ekipKodu); });
    modemReports.forEach(r => { if (r.ekipKodu) teams.add(r.ekipKodu); });
    return Array.from(teams).sort();
  };

  const getTeamStats = () => {
    const teams: Record<string, number> = {};
    reports.forEach(r => { if (r.ekipKodu && isWithinDateRange(r.timestamp)) teams[r.ekipKodu] = (teams[r.ekipKodu] || 0) + 1; });
    modemReports.forEach(r => { if (r.ekipKodu && isWithinDateRange(r.timestamp)) teams[r.ekipKodu] = (teams[r.ekipKodu] || 0) + 1; });
    return Object.entries(teams).sort((a, b) => b[1] - a[1]).slice(0, 10);
  };

  const isWithinDateRange = (timestamp: string): boolean => {
    if (!timestamp) return true;
    try {
      const parts = timestamp.split(' ')[0].split('.');
      if (parts.length === 3) {
        const rowDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return rowDate >= start && rowDate <= end;
      }
      return true;
    } catch {
      return true;
    }
  };

  const filterReports = (): Report[] => {
    return reports.filter(r => isWithinDateRange(r.timestamp || ''));
  };

  const filterModemReports = (): ModemSetupReport[] => {
    return modemReports.filter(m => isWithinDateRange(m.timestamp || ''));
  };

  const filterAnnouncements = (): Announcement[] => {
    return announcements.filter(a => isWithinDateRange(a.timestamp || ''));
  };

  const renderReportRow = (report: Report) => (
    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-[10px] font-bold text-slate-700 whitespace-nowrap">{report.hizmetNo || '-'}</td>
      <td className="px-4 py-3 text-[10px] font-bold text-slate-700 whitespace-nowrap">{report.saha || '-'}</td>
      <td className="px-4 py-3 text-[10px] font-bold text-slate-700 whitespace-nowrap">{report.kutu || '-'}</td>
      <td className="px-4 py-3 text-[10px] font-bold text-slate-700 whitespace-nowrap">{report.sorunTipi || '-'}</td>
      <td className="px-4 py-3 text-[10px] font-bold text-slate-700">{report.aciklama || '-'}</td>
      <td className="px-4 py-3 text-[10px] font-bold text-slate-700 whitespace-nowrap">{report.ekipKodu || '-'}</td>
      <td className="px-4 py-3 text-[10px] whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
          report.status === 'replied' ? 'bg-green-100 text-green-700' : 
          report.status === 'sent' ? 'bg-blue-100 text-blue-700' : 
          'bg-amber-100 text-amber-700'
        }`}>
          {report.status === 'replied' ? 'Yanıtlandı' : report.status === 'sent' ? 'İletildi' : 'Beklemede'}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {report.status !== 'replied' ? (
          <button 
            onClick={() => setReplyModal({ open: true, type: 'report', id: report.id, hizmetNo: report.hizmetNo })}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-[9px] font-black transition-all active:scale-95 shadow-sm"
          >
            <MessageCircle size={10} /> YANITLA
          </button>
        ) : (
          <div className="text-[9px] text-green-600 font-bold">
            <div>Yanıt: {report.reply}</div>
            <div className="text-slate-400">{report.replyAdmin} - {report.replyTimestamp}</div>
          </div>
        )}
      </td>
    </tr>
  );

  const renderModemRow = (modem: ModemSetupReport) => (
    <tr key={modem.id} className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-[10px] font-bold text-slate-700 whitespace-nowrap">{modem.hizmetNo || '-'}</td>
      <td className="px-4 py-3 text-[10px] font-bold text-slate-700 whitespace-nowrap">{modem.modemTipi || '-'}</td>
      <td className="px-4 py-3 text-[10px] font-bold text-slate-700">{modem.aciklama || '-'}</td>
      <td className="px-4 py-3 text-[10px] font-bold text-slate-700 whitespace-nowrap">{modem.ekipKodu || '-'}</td>
      <td className="px-4 py-3 text-center">
        {modem.status === 'replied' ? (
          <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full">
            <CheckCircle2 size={14} />
          </span>
        ) : (
          <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-200 text-slate-400 rounded-full">
            <Clock size={12} />
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-[10px] whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
          modem.status === 'replied' ? 'bg-green-100 text-green-700' :
          modem.status === 'sent' ? 'bg-blue-100 text-blue-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {modem.status === 'replied' ? 'Yanıtlandı' : modem.status === 'sent' ? 'İletildi' : 'Beklemede'}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {modem.status !== 'replied' ? (
          <button
            onClick={() => setReplyModal({ open: true, type: 'modem', id: modem.id, hizmetNo: modem.hizmetNo })}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-[9px] font-black transition-all active:scale-95 shadow-sm"
          >
            <MessageCircle size={10} /> YANITLA
          </button>
        ) : (
          <div className="text-[9px] text-green-600 font-bold">
            <div>Yanıt: {modem.reply}</div>
            <div className="text-slate-400">{modem.replyAdmin} - {modem.replyTimestamp}</div>
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Reply Modal */}
      {replyModal?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle size={20} />
                <h3 className="font-black text-sm uppercase tracking-widest">TALEBE YANIT VER</h3>
              </div>
              <button onClick={() => { setReplyModal(null); setReplyText(''); }} className="hover:bg-white/20 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Hizmet No</p>
                <p className="font-black text-lg text-slate-900">{replyModal.hizmetNo}</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Yanıtınız</label>
                <textarea 
                  rows={4}
                  className="w-full p-3 rounded-xl border-2 border-slate-200 bg-slate-50 font-bold text-xs outline-none focus:border-indigo-500 text-slate-900"
                  placeholder="Talebe vereceğiniz yanıtı yazın..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                />
              </div>
              <button 
                onClick={handleReply}
                disabled={isReplying || !replyText.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg uppercase tracking-widest"
              >
                {isReplying ? <Loader2 className="animate-spin" /> : <Send size={18} />} YANITI GÖNDER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm sticky top-20 z-40 space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setActiveView('overview')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeView === 'overview' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
              <LayoutDashboard size={14} /> ÖZET
            </button>
            <button onClick={() => setActiveView('teams')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeView === 'teams' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
              <Users size={14} /> EKİPLER
            </button>
            <button onClick={() => setActiveView('notify')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeView === 'notify' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
              <Bell size={14} /> DUYURU GÖNDER
            </button>
            <button onClick={() => setActiveView('settings')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeView === 'settings' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
              <Settings size={14} /> AYARLAR
            </button>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <Calendar size={12} className="text-slate-400" />
              <input 
                type="date" 
                className="bg-transparent text-[10px] font-bold outline-none text-slate-900" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="text-slate-300">-</span>
              <input 
                type="date" 
                className="bg-transparent text-[10px] font-bold outline-none text-slate-900" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <button onClick={fetchData} disabled={loading} className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="relative flex-1 md:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Ara..." className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none text-slate-900" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setActiveView('reports')} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all ${activeView === 'reports' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border-slate-200'}`}>
            Sorunlar ({filterReports().length})
          </button>
          <button onClick={() => setActiveView('modem_reports')} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all ${activeView === 'modem_reports' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border-slate-200'}`}>
            Modem Kurulum ({filterModemReports().length})
          </button>
          <button onClick={() => setActiveView('announcements')} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all ${activeView === 'announcements' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border-slate-200'}`}>
            Duyurular ({filterAnnouncements().length})
          </button>
        </div>
      </div>

      {/* Notify View */}
      {activeView === 'notify' && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
           <div className="bg-indigo-600 p-4 text-white flex items-center gap-3">
               <Bell size={20} />
               <h3 className="font-black text-sm uppercase tracking-widest">YENİ DUYURU OLUŞTUR</h3>
           </div>
           <form onSubmit={sendAnnouncement} className="p-6 space-y-4">
               <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Hedef Ekip</label>
                  <select 
                     className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-xs outline-none focus:border-indigo-500 text-slate-900"
                     value={announcementForm.target}
                     onChange={e => setAnnouncementForm({...announcementForm, target: e.target.value})}
                  >
                     <option value="HEPSİ">TÜM EKİPLER (GENEL)</option>
                     {getTeamList().map(t => <option key={t} value={t}>{t} EKİBİ</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Başlık</label>
                  <input 
                     required 
                     className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-xs outline-none focus:border-indigo-500 text-slate-900"
                     placeholder="Duyuru başlığı..."
                     value={announcementForm.title}
                     onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})}
                  />
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Mesaj İçeriği</label>
                  <textarea 
                     required 
                     rows={6}
                     className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-xs outline-none focus:border-indigo-500 text-slate-900"
                     placeholder="Ekiplere iletilecek detaylı mesaj..."
                     value={announcementForm.message}
                     onChange={e => setAnnouncementForm({...announcementForm, message: e.target.value})}
                  />
               </div>
               <button 
                 type="submit" 
                 disabled={isSendingAnnouncement} 
                 className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg uppercase tracking-widest"
               >
                 {isSendingAnnouncement ? <Loader2 className="animate-spin" /> : <Send size={18} />} BİLDİRİMİ GÖNDER
               </button>
           </form>
        </div>
      )}

      {/* Settings View */}
      {activeView === 'settings' && (
        <div className="max-w-xl mx-auto">
          <ConfigTab sheetUrl={pocketbaseUrl || ''} onUpdate={onUpdateUrl} />
        </div>
      )}

      {/* Overview View */}
      {activeView === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div 
              onClick={() => setActiveView('reports')}
              className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md active:scale-95 transition-all group"
            >
              <div className="bg-blue-50 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><AlertTriangle size={18} /></div>
              <div className="text-xl font-black text-slate-900 leading-none mb-1">{filterReports().length}</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SORUNLAR</div>
            </div>
            <div 
              onClick={() => setActiveView('announcements')}
              className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md active:scale-95 transition-all group"
            >
              <div className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Bell size={18} /></div>
              <div className="text-xl font-black text-slate-900 leading-none mb-1">{filterAnnouncements().length}</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DUYURULAR</div>
            </div>
            <div 
              onClick={() => setActiveView('modem_reports')}
              className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md active:scale-95 transition-all group"
            >
              <div className="bg-purple-50 text-purple-600 w-8 h-8 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Router size={18} /></div>
              <div className="text-xl font-black text-slate-900 leading-none mb-1">{filterModemReports().length}</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MODEM</div>
            </div>
          </div>
        </div>
      )}

      {/* Teams View */}
      {activeView === 'teams' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
             <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-400" />
                <h3 className="font-black text-xs uppercase tracking-widest">EKİP LİSTESİ VE AKTİVİTE</h3>
             </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {getTeamStats().map(([team, count]) => (
              <div key={team} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">EKİP KODU</div>
                  <div className="font-black text-slate-900">{team}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase">İŞLEM</div>
                  <div className="text-xl font-black text-indigo-600">{count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Table */}
      {activeView === 'reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
             <div className="flex items-center gap-2">
                <TableIcon size={16} className="text-indigo-400" />
                <h3 className="font-black text-xs uppercase tracking-widest">SORUNLAR LİSTESİ</h3>
             </div>
             <div className="text-[10px] font-black bg-white/10 px-2 py-1 rounded">TOPLAM: {filterReports().length}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Hizmet No</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Saha</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Kutu</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Sorun</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Açıklama</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Ekip</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Durum</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filterReports().filter(r =>
                  !searchTerm || 
                  r.hizmetNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  r.ekipKodu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  r.aciklama?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(renderReportRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modem Reports Table */}
      {activeView === 'modem_reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
             <div className="flex items-center gap-2">
                <Router size={16} className="text-indigo-400" />
                <h3 className="font-black text-xs uppercase tracking-widest">MODEM KURULUM TALEPLERİ</h3>
             </div>
             <div className="text-[10px] font-black bg-white/10 px-2 py-1 rounded">TOPLAM: {filterModemReports().length}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Hizmet No</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Modem Tipi</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Açıklama</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Ekip</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter text-center">✓</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Durum</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-tighter">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filterModemReports().filter(m =>
                  !searchTerm || 
                  m.hizmetNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  m.ekipKodu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  m.aciklama?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(renderModemRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Announcements View */}
      {activeView === 'announcements' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Bell size={16} className="text-indigo-600"/> DUYURULAR</h3>
          </div>
          {filterAnnouncements().length === 0 ? (
            <div className="bg-white p-10 text-center rounded-2xl border border-dashed border-slate-200">
              <Bell size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Henüz duyuru yok</p>
            </div>
          ) : (
            filterAnnouncements().filter(a =>
              !searchTerm ||
              a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              a.message?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((n) => (
              <div key={n.id} className="bg-white p-5 rounded-2xl border-l-4 border-indigo-600 shadow-md border-y border-r border-slate-100 space-y-3">
                <div className="flex justify-between items-start">
                   <div>
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{n.title}</h4>
                      <p className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 mt-1">
                        <Clock size={12}/> {n.timestamp}
                      </p>
                   </div>
                   <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${n.targetTeam === 'HEPSİ' ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-700'}`}>
                      {n.targetTeam === 'HEPSİ' ? 'GENEL' : 'ÖZEL'}
                   </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 font-medium leading-relaxed border border-slate-100 whitespace-pre-wrap">
                  {n.message}
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase text-right italic">
                  Gönderen: {n.sender}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
