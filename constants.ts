// Application constants
// Ekip kodları ve diğer magic strings tek yerden yönetim için

// Yönetici PIN kodları
export const ADMIN_PINS = ['ADMIN', '9999', 'FSEVKAMIRI1', 'FSEVKAMIRI2', 'FSAHAAMIRI', 'SHEFF'] as const;

// Yönetici şifresi
export const ADMIN_PASSWORD = 'FSAHAARTES';

// Ekip şifresi
export const TEAM_PASSWORD = 'ARTESSAHA';

// SAHA Ekipleri
export const SAHA_TEAMS = [
  '242FSAHA17550', '242FSAHA17551', '242FSAHA17552', '242FSAHA17553', '242FSAHA17554',
  '242FSAHA17555', '242FSAHA17556', '242FSAHA17557', '242FSAHA17558', '242FSAHA17559', '242FSAHA17560',
  '242FSAHA17561', '242FSAHA17562', '242FSAHA17563', '242FSAHA17564', '242FSAHA17565', '242FSAHA17599',
] as const;

// KABLO Ekipleri
export const KABLO_TEAMS = [
  '242FKABLO17599', '242FKABLO17600', '242FKABLO17601',
] as const;

// Test kullanıcıları
export const TEST_TEAMS = [
  '242FFO17501', '242TESTUSER1',
] as const;

// Tüm geçerli PIN kodları (Yönetici PINleri dahil)
export const ALL_VALID_PINS = [...ADMIN_PINS, ...SAHA_TEAMS, ...KABLO_TEAMS, ...TEST_TEAMS] as const;

// Tüm geçerli ekip kodları (sadece ekip kodları)
export const ALL_TEAM_PINS = [...SAHA_TEAMS, ...KABLO_TEAMS, ...TEST_TEAMS] as const;

// Ekip tipi kontrolü
export const isKabloTeam = (ekipKodu: string): boolean => (KABLO_TEAMS as readonly string[]).includes(ekipKodu);
export const isSahaTeam = (ekipKodu: string): boolean => (SAHA_TEAMS as readonly string[]).includes(ekipKodu);
export const isValidTeam = (ekipKodu: string): boolean => (ALL_TEAM_PINS as readonly string[]).includes(ekipKodu);

// PocketBase URL varsayılan değeri
export const DEFAULT_POCKETBASE_URL = 'http://localhost:8090';

// Bildirim yenileme aralığı (ms)
export const ANNOUNCEMENT_REFRESH_INTERVAL = 35000;

// İşlem tipleri
export const JOB_TYPES = {
  ARIZA: 'ARIZA',
  TESIS: 'TESIS',
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];

// Envanter aksiyon tipleri
export const INVENTORY_ACTIONS = {
  RECEIVE: 'receive',
  INSTALL: 'install',
  RETURN: 'return',
} as const;

export type InventoryActionType = typeof INVENTORY_ACTIONS[keyof typeof INVENTORY_ACTIONS];

// Kablo malzeme aksiyon tipleri
export const KABLO_ACTIONS = {
  AL: 'AL',
  KULLAN: 'KULLAN',
  DEMONTE: 'DEMONTE',
} as const;

export type KabloActionType = typeof KABLO_ACTIONS[keyof typeof KABLO_ACTIONS];

// Status değerleri
export const REPORT_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  REPLIED: 'replied',
  ERROR: 'error',
} as const;

export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS];

// Varsayılan modbus tipleri
export const MODEM_TYPES = ['VDSL', 'GPON'] as const;

// Varsayılan durum seçenekleri
export const DURUM_SECENEKLERI = ['İYİ', 'ORTA', 'KÖTÜ', 'YOK', 'ONARILDI'] as const;

// Kablo malzeme seçenekleri
export const KABLO_MATERIAL_OPTIONS = [
  '2x05', '4x05', '6x05', '10x05', '20x05', '30x05', '50x05', '100x05', '200x04', 
  'BEKTA', 'BEKTB', 'BEKTC', 'DİREK'
] as const;

// KABLO ekibi modem kontrol seçenekleri
export const KABLO_MODEM_OPTIONS = ['HIZ KONTROL', 'IP KONTROL', 'HIZ DÜŞÜR', 'SİL TANIT', 'İRTİBAT ?'] as const;

// SAHA ekibi modem kurulum seçenekleri
export const SAHA_MODEM_OPTIONS = ['KULLANICI ADI ŞİFRE', 'SİL TANIT', 'HIZ DÜŞÜR', 'İRTİBAT ?'] as const;
