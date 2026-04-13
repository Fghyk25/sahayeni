
import React, { useState } from 'react';
import { Check, Settings, Database, Copy, ExternalLink } from 'lucide-react';

interface ConfigTabProps {
  sheetUrl: string;
  onUpdate: (url: string) => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({ sheetUrl, onUpdate }) => {
  const [url, setUrl] = useState(sheetUrl);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    onUpdate(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const copyJson = () => {
    const collectionsJson = JSON.stringify(collectionsSchema, null, 2);
    navigator.clipboard.writeText(collectionsJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Database size={18} className="text-indigo-400" />
          <h3 className="font-black text-sm uppercase tracking-widest">POCKETBASE AYARLARI</h3>
        </div>
        <div className="flex gap-2">
          <span className="text-[9px] bg-indigo-500/20 px-2 py-1 rounded text-indigo-400 font-bold border border-indigo-500/30">v2.0</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PocketBase Sunucu URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold outline-none text-xs font-mono"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:8090"
            />
            <button onClick={handleSave} className="bg-indigo-600 text-white px-6 rounded-xl font-black text-xs active:scale-95 transition-all">
              {saved ? <Check size={20} /> : 'KAYDET'}
            </button>
          </div>
          <p className="text-[9px] text-slate-400 font-medium">
            PocketBase sunucu adresini girin (ör: http://localhost:8090 veya https://pb.example.com)
          </p>
        </div>

        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 space-y-3">
           <div className="flex gap-3">
              <Database className="text-indigo-600 shrink-0" size={20} />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-indigo-800 uppercase">PocketBase Kurulumu</p>
                <p className="text-[10px] text-indigo-700 font-bold leading-relaxed uppercase">
                  1. PocketBase'i indirin ve çalıştırın<br/>
                  2. Admin hesabı oluşturun<br/>
                  3. Aşağıdaki JSON'ı Import Collections'a yapıştırın<br/>
                  4. Admin > API > Public rule'u "Empty" olarak ayarlayın
                </p>
                <a 
                  href="https://pocketbase.io/docs/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-black flex items-center gap-1"
                >
                  <ExternalLink size={10} /> PocketBase Docs
                </a>
              </div>
           </div>
        </div>

        <div className="space-y-2">
           <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight flex items-center gap-2">
                <Database size={14} /> PocketBase Collections JSON
              </span>
              <button onClick={copyJson} className="text-[10px] bg-slate-100 px-3 py-1.5 rounded-full font-black uppercase tracking-tighter flex items-center gap-1">
                {copied ? <Check size={12}/> : <Copy size={12}/>}
                {copied ? 'KOPYALANDI' : 'JSON KOPYALA'}
              </button>
           </div>
           <pre className="bg-slate-900 text-green-400 p-4 rounded-xl text-[9px] overflow-x-auto max-h-60 font-mono leading-relaxed ring-1 ring-slate-800 shadow-inner">
             {JSON.stringify(collectionsSchema, null, 2)}
           </pre>
        </div>
      </div>
    </div>
  );
};

const collectionsSchema = [
  // 1. SORUNLAR (Problem Reports)
  {
    "name": "reports",
    "type": "base",
    "schema": [
      { "name": "hizmet_no", "type": "text", "required": false },
      { "name": "saha", "type": "text", "required": false },
      { "name": "kutu", "type": "text", "required": false },
      { "name": "sorun_tipi", "type": "text", "required": false },
      { "name": "aciklama", "type": "text", "required": false },
      { "name": "photo", "type": "text", "required": false },
      { "name": "location_lat", "type": "number", "required": false },
      { "name": "location_lng", "type": "number", "required": false },
      { "name": "ekip_kodu", "type": "text", "required": false },
      { "name": "status", "type": "select", "options": { "values": ["pending", "sent", "replied", "error"] } },
      { "name": "reply", "type": "text", "required": false },
      { "name": "reply_admin", "type": "text", "required": false },
      { "name": "reply_timestamp", "type": "text", "required": false }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  },
  // 2. MODEM KURULUMLAR (Modem Setup Reports)
  {
    "name": "modem_reports",
    "type": "base",
    "schema": [
      { "name": "hizmet_no", "type": "text", "required": false },
      { "name": "modem_tipi", "type": "text", "required": false },
      { "name": "aciklama", "type": "text", "required": false },
      { "name": "ekip_kodu", "type": "text", "required": false },
      { "name": "status", "type": "select", "options": { "values": ["pending", "sent", "replied", "error"] } },
      { "name": "reply", "type": "text", "required": false },
      { "name": "reply_admin", "type": "text", "required": false },
      { "name": "reply_timestamp", "type": "text", "required": false }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  },
  // 3. DUYURULAR (Announcements)
  {
    "name": "announcements",
    "type": "base",
    "schema": [
      { "name": "target_team", "type": "text", "required": false },
      { "name": "title", "type": "text", "required": false },
      { "name": "message", "type": "text", "required": false },
      { "name": "sender", "type": "text", "required": false }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  },
  // 4. HASAR TESPİTLERİ (Damage Reports)
  {
    "name": "damage_reports",
    "type": "base",
    "schema": [
      { "name": "proje_id", "type": "text", "required": false },
      { "name": "hasar_yapan_adsoyad", "type": "text", "required": false },
      { "name": "tc_kimlik", "type": "text", "required": false },
      { "name": "vergi_no", "type": "text", "required": false },
      { "name": "tel_no", "type": "text", "required": false },
      { "name": "cep_tel", "type": "text", "required": false },
      { "name": "hasar_yapan_adres", "type": "text", "required": false },
      { "name": "hasar_tarihi", "type": "text", "required": false },
      { "name": "hasar_saati", "type": "text", "required": false },
      { "name": "hasar_yeri", "type": "text", "required": false },
      { "name": "hasar_olus_sekli", "type": "text", "required": false },
      { "name": "tesis_cinsi_miktari", "type": "text", "required": false },
      { "name": "etkilenen_abone_sayisi", "type": "text", "required": false },
      { "name": "duzenleyen_personel", "type": "text", "required": false },
      { "name": "duzenleyen_unvan", "type": "text", "required": false },
      { "name": "tanik_bilgileri", "type": "text", "required": false },
      { "name": "guvenlik_gorevlisi", "type": "text", "required": false },
      { "name": "ihbar_eden", "type": "text", "required": false },
      { "name": "kullanilan_malzemeler", "type": "text", "required": false },
      { "name": "photo", "type": "text", "required": false },
      { "name": "location_lat", "type": "number", "required": false },
      { "name": "location_lng", "type": "number", "required": false },
      { "name": "ekip_kodu", "type": "text", "required": false },
      { "name": "status", "type": "select", "options": { "values": ["pending", "sent", "error"] } }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  },
  // 5. ENVANTER KAYITLARI (Inventory Logs)
  {
    "name": "inventory_logs",
    "type": "base",
    "schema": [
      { "name": "action_type", "type": "select", "options": { "values": ["receive", "install", "return"] } },
      { "name": "serial_number", "type": "text", "required": false },
      { "name": "hizmet_no", "type": "text", "required": false },
      { "name": "device_type", "type": "text", "required": false },
      { "name": "ekip_kodu", "type": "text", "required": false },
      { "name": "status", "type": "select", "options": { "values": ["pending", "sent", "error"] } }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  },
  // 6. İŞ TAMAMLAMALAR (Job Completion Reports)
  {
    "name": "job_completions",
    "type": "base",
    "schema": [
      { "name": "hizmet_no", "type": "text", "required": false },
      { "name": "is_tipi", "type": "select", "options": { "values": ["ARIZA", "TESIS"] } },
      { "name": "is_adedi", "type": "number", "required": false },
      { "name": "ekip_kodu", "type": "text", "required": false },
      { "name": "status", "type": "select", "options": { "values": ["pending", "sent", "error"] } }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  },
  // 7. ARAÇ KAYITLARI (Vehicle Logs)
  {
    "name": "vehicle_logs",
    "type": "base",
    "schema": [
      { "name": "plaka", "type": "text", "required": false },
      { "name": "kilometre", "type": "number", "required": false },
      { "name": "ekip_kodu", "type": "text", "required": false },
      { "name": "status", "type": "select", "options": { "values": ["pending", "sent", "error"] } }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  },
  // 8. PORT DEĞİŞİMLERİ (Port Change Reports)
  {
    "name": "port_changes",
    "type": "base",
    "schema": [
      { "name": "hizmet_no", "type": "text", "required": false },
      { "name": "yeni_port", "type": "text", "required": false },
      { "name": "yeni_devre", "type": "text", "required": false },
      { "name": "aciklama", "type": "text", "required": false },
      { "name": "ekip_kodu", "type": "text", "required": false },
      { "name": "status", "type": "select", "options": { "values": ["pending", "sent", "error"] } }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  },
  // 9. İYİLEŞTİRME BİLDİRİMLERİ (Improvement Notifications)
  {
    "name": "improvement_notifications",
    "type": "base",
    "schema": [
      { "name": "yerlesim_adi", "type": "text", "required": false },
      { "name": "bakim_tarihi", "type": "text", "required": false },
      { "name": "kablo_durumu", "type": "text", "required": false },
      { "name": "menhol_durumu", "type": "text", "required": false },
      { "name": "direk_durumu", "type": "text", "required": false },
      { "name": "direk_donanim_durumu", "type": "text", "required": false },
      { "name": "kutu_kabin_durumu", "type": "text", "required": false },
      { "name": "takdir_puani", "type": "number", "required": false },
      { "name": "photo", "type": "text", "required": false },
      { "name": "location_lat", "type": "number", "required": false },
      { "name": "location_lng", "type": "number", "required": false },
      { "name": "ekip_kodu", "type": "text", "required": false },
      { "name": "status", "type": "select", "options": { "values": ["pending", "sent", "error"] } },
      { "name": "improvement_type", "type": "select", "options": { "values": ["bildirim", "imalat"] } }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  },
  // 10. İYİLEŞTİRME İMALATLARI (Improvement Productions)
  {
    "name": "improvement_productions",
    "type": "base",
    "schema": [
      { "name": "yerlesim_adi", "type": "text", "required": false },
      { "name": "bakim_tarihi", "type": "text", "required": false },
      { "name": "kablo_durumu", "type": "text", "required": false },
      { "name": "menhol_durumu", "type": "text", "required": false },
      { "name": "direk_durumu", "type": "text", "required": false },
      { "name": "direk_donanim_durumu", "type": "text", "required": false },
      { "name": "kutu_kabin_durumu", "type": "text", "required": false },
      { "name": "takdir_puani", "type": "number", "required": false },
      { "name": "photo", "type": "text", "required": false },
      { "name": "location_lat", "type": "number", "required": false },
      { "name": "location_lng", "type": "number", "required": false },
      { "name": "ekip_kodu", "type": "text", "required": false },
      { "name": "status", "type": "select", "options": { "values": ["pending", "sent", "error"] } }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  },
  // 11. KABLO MALZEME (Cable Material Reports)
  {
    "name": "kablo_materials",
    "type": "base",
    "schema": [
      { "name": "action_type", "type": "select", "options": { "values": ["AL", "KULLAN", "DEMONTE"] } },
      { "name": "items_json", "type": "text", "required": false },
      { "name": "ekip_kodu", "type": "text", "required": false },
      { "name": "status", "type": "select", "options": { "values": ["pending", "sent", "error"] } }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  }
];
