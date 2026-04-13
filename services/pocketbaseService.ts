// PocketBase service for database operations
// Uses fetch API directly instead of PocketBase SDK
// Supports pagination and offline caching

import { Report, ModemSetupReport, Announcement, DamageReport, JobCompletionReport, VehicleLog, PortChangeReport, InventoryLog, ImprovementReport, KabloMaterialReport } from '../types';
import { indexedDBService } from './indexedDBService';

interface PocketBaseRecord {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
  [key: string]: any;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

class PocketBaseService {
  private baseUrl: string = '';

  initialize(baseUrl: string) {
    if (!baseUrl) {
      console.warn('PocketBase URL not configured');
      return;
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
    console.log('PocketBase initialized:', this.baseUrl);
  }

  isInitialized(): boolean {
    return this.baseUrl !== '';
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async api(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.baseUrl) {
      throw new Error('PocketBase not initialized');
    }

    const url = `${this.baseUrl}/api/collections/${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`PocketBase API error: ${response.status} - ${error}`);
      }
      return response.json();
    } catch (err) {
      // If network error, try to get from IndexedDB cache
      if (err instanceof TypeError && err.message.includes('fetch')) {
        console.warn('Network error, trying cache...');
        return null;
      }
      throw err;
    }
  }

  // ==================== REPORTS (with pagination) ====================

  async createReport(report: Report): Promise<Report | null> {
    try {
      const record = await this.api('reports/records', {
        method: 'POST',
        body: JSON.stringify({
          hizmet_no: report.hizmetNo,
          saha: report.saha,
          kutu: report.kutu,
          sorun_tipi: report.sorunTipi,
          aciklama: report.aciklama,
          photo: report.photo || '',
          location_lat: report.location?.lat || 0,
          location_lng: report.location?.lng || 0,
          ekip_kodu: report.ekipKodu,
          status: report.status,
        }),
      });
      
      // Save to IndexedDB for offline access
      if (record) {
        const mapped = this.mapReportRecord(record);
        await indexedDBService.addRecord('reports', mapped);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Failed to create report, queuing for later:', err);
      // Queue for offline sync
      await indexedDBService.addPendingOperation({
        type: 'create',
        collection: 'reports',
        data: report,
      });
      return null;
    }
  }

  async getReportsPaginated(
    page: number = 1, 
    pageSize: number = 20, 
    ekipKodu?: string,
    useCache: boolean = true
  ): Promise<PaginatedResponse<Report>> {
    const cacheKey = `reports_page_${page}_${pageSize}_${ekipKodu || 'all'}`;
    
    // Try cache first
    if (useCache) {
      const cached = await indexedDBService.getCache<Report[]>(cacheKey);
      if (cached) {
        const allCached = await indexedDBService.getRecords<Report>('reports');
        return {
          items: cached,
          total: allCached.length,
          page,
          perPage: pageSize,
          totalPages: Math.ceil(allCached.length / pageSize),
        };
      }
    }

    const filter = ekipKodu ? `ekip_kodu="${ekipKodu}"` : '';
    const result = await this.api(
      `reports/records?sort=-created&page=${page}&perPage=${pageSize}&filter=${encodeURIComponent(filter)}`
    );

    if (!result) {
      // Return from IndexedDB if network fails
      const cached = await indexedDBService.getRecords<Report>('reports');
      return {
        items: cached.slice((page - 1) * pageSize, page * pageSize),
        total: cached.length,
        page,
        perPage: pageSize,
        totalPages: Math.ceil(cached.length / pageSize),
      };
    }

    const records: PocketBaseRecord[] = result.items || [];
    const mapped = records.map(r => this.mapReportRecord(r));

    // Cache results
    await indexedDBService.setCache(cacheKey, mapped, 2 * 60 * 1000); // 2 min cache
    
    // Also update full cache store
    if (page === 1) {
      const allRecords = await this.getAllReports();
      await indexedDBService.saveRecords('reports', allRecords);
    }

    return {
      items: mapped,
      total: result.total || 0,
      page: result.page || page,
      perPage: result.perPage || pageSize,
      totalPages: result.totalPages || Math.ceil((result.total || 0) / pageSize),
    };
  }

  async getReports(ekipKodu?: string): Promise<Report[]> {
    const filter = ekipKodu ? `ekip_kodu="${ekipKodu}"` : '';
    const result = await this.api(`reports/records?sort=-created&filter=${encodeURIComponent(filter)}`);
    
    if (!result) {
      return indexedDBService.getRecords<Report>('reports');
    }
    
    const records: PocketBaseRecord[] = result.items || [];
    return records.map(r => this.mapReportRecord(r));
  }

  async getAllReports(): Promise<Report[]> {
    const result = await this.api('reports/records?sort=-created');
    
    if (!result) {
      return indexedDBService.getRecords<Report>('reports');
    }
    
    const records: PocketBaseRecord[] = result.items || [];
    return records.map(r => this.mapReportRecord(r));
  }

  async updateReportReply(id: string, reply: string, adminEkipKodu: string): Promise<void> {
    await this.api(`reports/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        reply,
        reply_admin: adminEkipKodu,
        reply_timestamp: new Date().toLocaleString('tr-TR'),
        status: 'replied',
      }),
    });

    // Update local cache
    const cached = await indexedDBService.getRecords<Report>('reports');
    const idx = cached.findIndex(r => r.id === id);
    if (idx >= 0) {
      cached[idx].status = 'replied';
      cached[idx].reply = reply;
      cached[idx].replyAdmin = adminEkipKodu;
      cached[idx].replyTimestamp = new Date().toLocaleString('tr-TR');
      await indexedDBService.saveRecords('reports', cached);
    }
  }

  // ==================== MODEM SETUP REPORTS (with pagination) ====================

  async createModemReport(report: ModemSetupReport): Promise<ModemSetupReport | null> {
    try {
      const record = await this.api('modem_reports/records', {
        method: 'POST',
        body: JSON.stringify({
          hizmet_no: report.hizmetNo,
          modem_tipi: report.modemTipi,
          aciklama: report.aciklama,
          ekip_kodu: report.ekipKodu,
          status: report.status,
        }),
      });
      
      if (record) {
        const mapped = this.mapModemRecord(record);
        await indexedDBService.addRecord('modem_reports', mapped);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Failed to create modem report, queuing for later:', err);
      await indexedDBService.addPendingOperation({
        type: 'create',
        collection: 'modem_reports',
        data: report,
      });
      return null;
    }
  }

  async getModemReportsPaginated(
    page: number = 1, 
    pageSize: number = 20,
    useCache: boolean = true
  ): Promise<PaginatedResponse<ModemSetupReport>> {
    const cacheKey = `modem_reports_page_${page}_${pageSize}`;
    
    if (useCache) {
      const cached = await indexedDBService.getCache<ModemSetupReport[]>(cacheKey);
      if (cached) {
        const allCached = await indexedDBService.getRecords<ModemSetupReport>('modem_reports');
        return {
          items: cached,
          total: allCached.length,
          page,
          perPage: pageSize,
          totalPages: Math.ceil(allCached.length / pageSize),
        };
      }
    }

    const result = await this.api(
      `modem_reports/records?sort=-created&page=${page}&perPage=${pageSize}`
    );

    if (!result) {
      const cached = await indexedDBService.getRecords<ModemSetupReport>('modem_reports');
      return {
        items: cached.slice((page - 1) * pageSize, page * pageSize),
        total: cached.length,
        page,
        perPage: pageSize,
        totalPages: Math.ceil(cached.length / pageSize),
      };
    }

    const records: PocketBaseRecord[] = result.items || [];
    const mapped = records.map(r => this.mapModemRecord(r));

    await indexedDBService.setCache(cacheKey, mapped, 2 * 60 * 1000);
    
    if (page === 1) {
      const allRecords = await this.getModemReports();
      await indexedDBService.saveRecords('modem_reports', allRecords);
    }

    return {
      items: mapped,
      total: result.total || 0,
      page: result.page || page,
      perPage: result.perPage || pageSize,
      totalPages: result.totalPages || Math.ceil((result.total || 0) / pageSize),
    };
  }

  async getModemReports(): Promise<ModemSetupReport[]> {
    const result = await this.api('modem_reports/records?sort=-created');
    
    if (!result) {
      return indexedDBService.getRecords<ModemSetupReport>('modem_reports');
    }
    
    const records: PocketBaseRecord[] = result.items || [];
    return records.map(r => this.mapModemRecord(r));
  }

  async updateModemReportReply(id: string, reply: string, adminEkipKodu: string): Promise<void> {
    await this.api(`modem_reports/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        reply,
        reply_admin: adminEkipKodu,
        reply_timestamp: new Date().toLocaleString('tr-TR'),
        status: 'replied',
      }),
    });

    // Update local cache
    const cached = await indexedDBService.getRecords<ModemSetupReport>('modem_reports');
    const idx = cached.findIndex(r => r.id === id);
    if (idx >= 0) {
      cached[idx].status = 'replied';
      cached[idx].reply = reply;
      cached[idx].replyAdmin = adminEkipKodu;
      cached[idx].replyTimestamp = new Date().toLocaleString('tr-TR');
      await indexedDBService.saveRecords('modem_reports', cached);
    }
  }

  // ==================== ANNOUNCEMENTS ====================

  async createAnnouncement(announcement: Announcement): Promise<Announcement | null> {
    try {
      const record = await this.api('announcements/records', {
        method: 'POST',
        body: JSON.stringify({
          target_team: announcement.targetTeam,
          title: announcement.title,
          message: announcement.message,
          sender: announcement.sender,
        }),
      });
      
      if (record) {
        const mapped = this.mapAnnouncementRecord(record);
        await indexedDBService.addRecord('announcements', mapped);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Failed to create announcement, queuing for later:', err);
      await indexedDBService.addPendingOperation({
        type: 'create',
        collection: 'announcements',
        data: announcement,
      });
      return null;
    }
  }

  async getAnnouncements(ekipKodu?: string): Promise<Announcement[]> {
    const result = await this.api('announcements/records?sort=-created');
    
    if (!result) {
      return indexedDBService.getRecords<Announcement>('announcements');
    }
    
    const allRecords: PocketBaseRecord[] = result.items || [];
    
    return allRecords
      .filter(record => {
        const target = (record.target_team || '').toUpperCase();
        const current = (ekipKodu || '').toUpperCase();
        return target === 'HEPSİ' || target === current || target === '';
      })
      .map(r => this.mapAnnouncementRecord(r));
  }

  // ==================== DAMAGE REPORTS ====================

  async createDamageReport(report: DamageReport): Promise<DamageReport | null> {
    try {
      const record = await this.api('damage_reports/records', {
        method: 'POST',
        body: JSON.stringify({
          proje_id: report.projeId,
          hasar_yapan_ad: report.hasarYapanAdSoyad,
          tc_kimlik: report.tcKimlik,
          vergi_no: report.vergiNo,
          tel_no: report.telNo,
          cep_tel: report.cepTel,
          adres: report.hasarYapanAdres,
          tarih: report.hasarTarihi,
          saat: report.hasarSaati,
          hasar_yeri: report.hasarYeri,
          hasar_sekli: report.hasarOlusSekli,
          tesis_cinsi: report.tesisCinsiMiktari,
          etkilenen_abone: report.etkilenenAboneSayisi,
          personel: report.duzenleyenPersonel,
          unvan: report.duzenleyenUnvan,
          tanik: report.tanikBilgileri,
          guvenlik: report.guvenlikGorevlisi,
          ihbar_eden: report.ihbarEden,
          malzemeler: report.kullanilanMalzemeler,
          photo: report.photo || '',
          location_lat: report.location?.lat || 0,
          location_lng: report.location?.lng || 0,
          ekip_kodu: report.ekipKodu,
          status: report.status,
        }),
      });
      
      if (record) {
        const mapped = this.mapDamageRecord(record);
        await indexedDBService.addRecord('damage_reports', mapped);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Failed to create damage report, queuing for later:', err);
      await indexedDBService.addPendingOperation({
        type: 'create',
        collection: 'damage_reports',
        data: report,
      });
      return null;
    }
  }

  // ==================== JOB COMPLETION REPORTS ====================

  async createJobCompletionReport(report: JobCompletionReport): Promise<JobCompletionReport | null> {
    try {
      const record = await this.api('job_completions/records', {
        method: 'POST',
        body: JSON.stringify({
          hizmet_no: report.hizmetNo,
          is_tipi: report.isTipi,
          is_adedi: report.isAdedi,
          ekip_kodu: report.ekipKodu,
          status: report.status,
        }),
      });
      
      if (record) {
        const mapped = this.mapJobCompletionRecord(record);
        await indexedDBService.addRecord('job_completions', mapped);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Failed to create job completion report, queuing for later:', err);
      await indexedDBService.addPendingOperation({
        type: 'create',
        collection: 'job_completions',
        data: report,
      });
      return null;
    }
  }

  // ==================== VEHICLE LOGS ====================

  async createVehicleLog(log: VehicleLog): Promise<VehicleLog | null> {
    try {
      const record = await this.api('vehicle_logs/records', {
        method: 'POST',
        body: JSON.stringify({
          plaka: log.plaka,
          kilometre: log.kilometre,
          ekip_kodu: log.ekipKodu,
          status: log.status,
        }),
      });
      
      if (record) {
        const mapped = this.mapVehicleLogRecord(record);
        await indexedDBService.addRecord('vehicle_logs', mapped);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Failed to create vehicle log, queuing for later:', err);
      await indexedDBService.addPendingOperation({
        type: 'create',
        collection: 'vehicle_logs',
        data: log,
      });
      return null;
    }
  }

  // ==================== PORT CHANGE REPORTS ====================

  async createPortChangeReport(report: PortChangeReport): Promise<PortChangeReport | null> {
    try {
      const record = await this.api('port_changes/records', {
        method: 'POST',
        body: JSON.stringify({
          hizmet_no: report.hizmetNo,
          yeni_port: report.yeniPort,
          yeni_devre: report.yeniDevre,
          aciklama: report.aciklama,
          ekip_kodu: report.ekipKodu,
          status: report.status,
        }),
      });
      
      if (record) {
        const mapped = this.mapPortChangeRecord(record);
        await indexedDBService.addRecord('port_changes', mapped);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Failed to create port change report, queuing for later:', err);
      await indexedDBService.addPendingOperation({
        type: 'create',
        collection: 'port_changes',
        data: report,
      });
      return null;
    }
  }

  // ==================== INVENTORY LOGS ====================

  async createInventoryLog(log: InventoryLog): Promise<InventoryLog | null> {
    try {
      const record = await this.api('inventory_logs/records', {
        method: 'POST',
        body: JSON.stringify({
          action_type: log.actionType,
          serial_number: log.serialNumber,
          hizmet_no: log.hizmetNo || '',
          device_type: log.deviceType || '',
          ekip_kodu: log.ekipKodu,
          status: log.status,
        }),
      });
      
      if (record) {
        const mapped = this.mapInventoryLogRecord(record);
        await indexedDBService.addRecord('inventory_logs', mapped);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Failed to create inventory log, queuing for later:', err);
      await indexedDBService.addPendingOperation({
        type: 'create',
        collection: 'inventory_logs',
        data: log,
      });
      return null;
    }
  }

  // ==================== IMPROVEMENT REPORTS ====================

  async createImprovementReport(report: ImprovementReport): Promise<ImprovementReport | null> {
    try {
      const record = await this.api('improvement_reports/records', {
        method: 'POST',
        body: JSON.stringify({
          yerlesim_adi: report.yerlesimAdi,
          bakim_tarihi: report.bakimTarihi,
          kablo_durumu: report.kabloDurumu,
          menhol_durumu: report.menholDurumu,
          direk_durumu: report.direkDurumu,
          direk_donanim: report.direkDonanimDurumu,
          kutu_durumu: report.kutuKabinDurumu,
          takdir_puani: report.takdirPuani,
          photo: report.photo || '',
          location_lat: report.location?.lat || 0,
          location_lng: report.location?.lng || 0,
          ekip_kodu: report.ekipKodu,
          improvement_type: report.improvementType || 'bildirim',
          status: report.status,
        }),
      });
      
      if (record) {
        const mapped = this.mapImprovementRecord(record);
        await indexedDBService.addRecord('improvement_reports', mapped);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Failed to create improvement report, queuing for later:', err);
      await indexedDBService.addPendingOperation({
        type: 'create',
        collection: 'improvement_reports',
        data: report,
      });
      return null;
    }
  }

  // ==================== KABLO MATERIAL REPORTS ====================

  async createKabloMaterialReport(report: KabloMaterialReport): Promise<KabloMaterialReport | null> {
    try {
      const record = await this.api('kablo_materials/records', {
        method: 'POST',
        body: JSON.stringify({
          action_type: report.actionType,
          items: JSON.stringify(report.items),
          ekip_kodu: report.ekipKodu,
          status: report.status,
        }),
      });
      
      if (record) {
        const mapped = this.mapKabloMaterialRecord(record);
        await indexedDBService.addRecord('kablo_materials', mapped);
        return mapped;
      }
      return null;
    } catch (err) {
      console.error('Failed to create kablo material report, queuing for later:', err);
      await indexedDBService.addPendingOperation({
        type: 'create',
        collection: 'kablo_materials',
        data: report,
      });
      return null;
    }
  }

  // ==================== OFFLINE SYNC ====================

  async syncPendingOperations(): Promise<{ success: number; failed: number }> {
    const pending = await indexedDBService.getPendingOperations();
    let success = 0;
    let failed = 0;

    for (const op of pending) {
      try {
        if (op.type === 'create') {
          switch (op.collection) {
            case 'reports': await this.createReport(op.data); break;
            case 'modem_reports': await this.createModemReport(op.data); break;
            case 'announcements': await this.createAnnouncement(op.data); break;
            case 'damage_reports': await this.createDamageReport(op.data); break;
            case 'job_completions': await this.createJobCompletionReport(op.data); break;
            case 'vehicle_logs': await this.createVehicleLog(op.data); break;
            case 'port_changes': await this.createPortChangeReport(op.data); break;
            case 'inventory_logs': await this.createInventoryLog(op.data); break;
            case 'improvement_reports': await this.createImprovementReport(op.data); break;
            case 'kablo_materials': await this.createKabloMaterialReport(op.data); break;
          }
        }
        await indexedDBService.removePendingOperation(op.id);
        success++;
      } catch (err) {
        console.error('Failed to sync operation:', op.id, err);
        await indexedDBService.updatePendingOperation(op.id, { retries: op.retries + 1 });
        failed++;
      }
    }

    return { success, failed };
  }

  // ==================== HELPERS ====================

  private mapReportRecord(record: PocketBaseRecord): Report {
    return {
      id: record.id || '',
      hizmetNo: record.hizmet_no || '',
      saha: record.saha || '',
      kutu: record.kutu || '',
      sorunTipi: record.sorun_tipi || '',
      aciklama: record.aciklama || '',
      photo: record.photo || undefined,
      location: record.location_lat ? {
        lat: record.location_lat,
        lng: record.location_lng || 0,
      } : undefined,
      ekipKodu: record.ekip_kodu || '',
      timestamp: record.created ? new Date(record.created).toLocaleString('tr-TR') : '',
      status: record.status || 'sent',
      reportType: 'problem',
      reply: record.reply || '',
      replyAdmin: record.reply_admin || '',
      replyTimestamp: record.reply_timestamp || '',
    };
  }

  private mapModemRecord(record: PocketBaseRecord): ModemSetupReport {
    return {
      id: record.id || '',
      hizmetNo: record.hizmet_no || '',
      modemTipi: record.modem_tipi || '',
      aciklama: record.aciklama || '',
      ekipKodu: record.ekip_kodu || '',
      timestamp: record.created ? new Date(record.created).toLocaleString('tr-TR') : '',
      status: record.status || 'sent',
      reportType: 'modem_setup',
      reply: record.reply || '',
      replyAdmin: record.reply_admin || '',
      replyTimestamp: record.reply_timestamp || '',
    };
  }

  private mapAnnouncementRecord(record: PocketBaseRecord): Announcement {
    return {
      id: record.id || '',
      timestamp: record.created ? new Date(record.created).toLocaleString('tr-TR') : '',
      targetTeam: record.target_team || '',
      title: record.title || '',
      message: record.message || '',
      sender: record.sender || '',
      reportType: 'announcement',
    };
  }

  private mapDamageRecord(record: PocketBaseRecord): DamageReport {
    return {
      id: record.id || '',
      projeId: record.proje_id || '',
      hasarYapanAdSoyad: record.hasar_yapan_ad || '',
      tcKimlik: record.tc_kimlik || '',
      vergiNo: record.vergi_no || '',
      telNo: record.tel_no || '',
      cepTel: record.cep_tel || '',
      hasarYapanAdres: record.adres || '',
      hasarTarihi: record.tarih || '',
      hasarSaati: record.saat || '',
      hasarYeri: record.hasar_yeri || '',
      hasarOlusSekli: record.hasar_sekli || '',
      tesisCinsiMiktari: record.tesis_cinsi || '',
      etkilenenAboneSayisi: record.etkilenen_abone || '',
      duzenleyenPersonel: record.personel || '',
      duzenleyenUnvan: record.unvan || '',
      tanikBilgileri: record.tanik || '',
      guvenlikGorevlisi: record.guvenlik || '',
      ihbarEden: record.ihbar_eden || '',
      kullanilanMalzemeler: record.malzemeler || '',
      photo: record.photo || undefined,
      location: record.location_lat ? { lat: record.location_lat, lng: record.location_lng || 0 } : undefined,
      ekipKodu: record.ekip_kodu || '',
      timestamp: record.created ? new Date(record.created).toLocaleString('tr-TR') : '',
      status: record.status || 'sent',
      reportType: 'damage_report',
    };
  }

  private mapJobCompletionRecord(record: PocketBaseRecord): JobCompletionReport {
    return {
      id: record.id || '',
      hizmetNo: record.hizmet_no || '',
      isTipi: record.is_tipi || 'ARIZA',
      isAdedi: record.is_adedi || 1,
      ekipKodu: record.ekip_kodu || '',
      timestamp: record.created ? new Date(record.created).toLocaleString('tr-TR') : '',
      status: record.status || 'sent',
      reportType: 'job_completion',
    };
  }

  private mapVehicleLogRecord(record: PocketBaseRecord): VehicleLog {
    return {
      id: record.id || '',
      plaka: record.plaka || '',
      kilometre: record.kilometre || 0,
      ekipKodu: record.ekip_kodu || '',
      timestamp: record.created ? new Date(record.created).toLocaleString('tr-TR') : '',
      status: record.status || 'sent',
      reportType: 'vehicle_log',
    };
  }

  private mapPortChangeRecord(record: PocketBaseRecord): PortChangeReport {
    return {
      id: record.id || '',
      hizmetNo: record.hizmet_no || '',
      yeniPort: record.yeni_port || '',
      yeniDevre: record.yeni_devre || '',
      aciklama: record.aciklama || '',
      ekipKodu: record.ekip_kodu || '',
      timestamp: record.created ? new Date(record.created).toLocaleString('tr-TR') : '',
      status: record.status || 'sent',
      reportType: 'port_change',
    };
  }

  private mapInventoryLogRecord(record: PocketBaseRecord): InventoryLog {
    return {
      id: record.id || '',
      actionType: record.action_type || 'receive',
      serialNumber: record.serial_number || '',
      hizmetNo: record.hizmet_no || undefined,
      deviceType: record.device_type || undefined,
      ekipKodu: record.ekip_kodu || '',
      timestamp: record.created ? new Date(record.created).toLocaleString('tr-TR') : '',
      status: record.status || 'sent',
      reportType: 'inventory',
    };
  }

  private mapImprovementRecord(record: PocketBaseRecord): ImprovementReport {
    return {
      id: record.id || '',
      yerlesimAdi: record.yerlesim_adi || '',
      bakimTarihi: record.bakim_tarihi || '',
      kabloDurumu: record.kablo_durumu || 'İYİ',
      menholDurumu: record.menhol_durumu || 'İYİ',
      direkDurumu: record.direk_durumu || 'İYİ',
      direkDonanimDurumu: record.direk_donanim || 'İYİ',
      kutuKabinDurumu: record.kutu_durumu || 'İYİ',
      takdirPuani: record.takdir_puani || 5,
      photo: record.photo || undefined,
      location: record.location_lat ? { lat: record.location_lat, lng: record.location_lng || 0 } : undefined,
      ekipKodu: record.ekip_kodu || '',
      timestamp: record.created ? new Date(record.created).toLocaleString('tr-TR') : '',
      status: record.status || 'sent',
      improvementType: record.improvement_type || 'bildirim',
      reportType: record.improvement_type === 'imalat' ? 'improvement_production' : 'improvement_notification',
    };
  }

  private mapKabloMaterialRecord(record: PocketBaseRecord): KabloMaterialReport {
    let items: { material: string; quantity: string }[] = [];
    try {
      items = typeof record.items === 'string' ? JSON.parse(record.items) : (record.items || []);
    } catch {}
    return {
      id: record.id || '',
      actionType: record.action_type || 'AL',
      items,
      ekipKodu: record.ekip_kodu || '',
      timestamp: record.created ? new Date(record.created).toLocaleString('tr-TR') : '',
      status: record.status || 'sent',
      reportType: 'kablo_material',
    };
  }
}

export const pocketbaseService = new PocketBaseService();
