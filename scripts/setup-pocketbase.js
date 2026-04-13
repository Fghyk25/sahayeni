/**
 * PocketBase Collections Setup Script
 * 
 * Bu script, PocketBase veritabanında gerekli tüm kolleksiyonları otomatik olarak oluşturur.
 * SahaRapor_v15.gs dosyasındaki tüm form türlerini destekler.
 * 
 * Kullanım:
 * 1. PocketBase'in çalıştığından emin olun (localhost:8090 gibi)
 * 2. Admin paneline giriş yapın
 * 3. Settings > Import Collections bölümüne gidin
 * 4. Aşağıdaki JSON'ı yapıştırın
 * 
 * VEYA
 * 
 * API üzerinden otomatik oluşturmak için:
 * node scripts/setup-pocketbase.js
 */

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'adminpassword1234';

// Collections to create - Tüm form türleri
const collections = [
  // 1. SORUNLAR (Problem Reports)
  {
    name: 'reports',
    type: 'base',
    schema: [
      { name: 'hizmet_no', type: 'text', required: false },
      { name: 'saha', type: 'text', required: false },
      { name: 'kutu', type: 'text', required: false },
      { name: 'sorun_tipi', type: 'text', required: false },
      { name: 'aciklama', type: 'text', required: false },
      { name: 'photo', type: 'text', required: false },
      { name: 'location_lat', type: 'number', required: false },
      { name: 'location_lng', type: 'number', required: false },
      { name: 'ekip_kodu', type: 'text', required: false },
      { name: 'status', type: 'select', options: { values: ['pending', 'sent', 'replied', 'error'] } },
      { name: 'reply', type: 'text', required: false },
      { name: 'reply_admin', type: 'text', required: false },
      { name: 'reply_timestamp', type: 'text', required: false },
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },

  // 2. MODEM KURULUMLAR (Modem Setup Reports)
  {
    name: 'modem_reports',
    type: 'base',
    schema: [
      { name: 'hizmet_no', type: 'text', required: false },
      { name: 'modem_tipi', type: 'text', required: false },
      { name: 'aciklama', type: 'text', required: false },
      { name: 'ekip_kodu', type: 'text', required: false },
      { name: 'status', type: 'select', options: { values: ['pending', 'sent', 'replied', 'error'] } },
      { name: 'reply', type: 'text', required: false },
      { name: 'reply_admin', type: 'text', required: false },
      { name: 'reply_timestamp', type: 'text', required: false },
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },

  // 3. DUYURULAR (Announcements)
  {
    name: 'announcements',
    type: 'base',
    schema: [
      { name: 'target_team', type: 'text', required: false },
      { name: 'title', type: 'text', required: false },
      { name: 'message', type: 'text', required: false },
      { name: 'sender', type: 'text', required: false },
    ],
    listRule: '',
    viewRule: '',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },

  // 4. HASAR TESPİTLERİ (Damage Reports)
  {
    name: 'damage_reports',
    type: 'base',
    schema: [
      { name: 'proje_id', type: 'text', required: false },
      { name: 'hasar_yapan_ad', type: 'text', required: false },
      { name: 'tc_kimlik', type: 'text', required: false },
      { name: 'vergi_no', type: 'text', required: false },
      { name: 'tel_no', type: 'text', required: false },
      { name: 'cep_tel', type: 'text', required: false },
      { name: 'adres', type: 'text', required: false },
      { name: 'tarih', type: 'text', required: false },
      { name: 'saat', type: 'text', required: false },
      { name: 'hasar_yeri', type: 'text', required: false },
      { name: 'hasar_sekli', type: 'text', required: false },
      { name: 'tesis_cinsi', type: 'text', required: false },
      { name: 'etkilenen_abone', type: 'text', required: false },
      { name: 'personel', type: 'text', required: false },
      { name: 'unvan', type: 'text', required: false },
      { name: 'tanik', type: 'text', required: false },
      { name: 'guvenlik', type: 'text', required: false },
      { name: 'ihbar_eden', type: 'text', required: false },
      { name: 'malzemeler', type: 'text', required: false },
      { name: 'photo', type: 'text', required: false },
      { name: 'location_lat', type: 'number', required: false },
      { name: 'location_lng', type: 'number', required: false },
      { name: 'ekip_kodu', type: 'text', required: false },
      { name: 'status', type: 'select', options: { values: ['pending', 'sent', 'error'] } },
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },

  // 5. ENVANTER KAYITLARI (Inventory Logs)
  {
    name: 'inventory_logs',
    type: 'base',
    schema: [
      { name: 'action_type', type: 'select', options: { values: ['receive', 'install', 'return'] } },
      { name: 'serial_number', type: 'text', required: false },
      { name: 'hizmet_no', type: 'text', required: false },
      { name: 'device_type', type: 'text', required: false },
      { name: 'ekip_kodu', type: 'text', required: false },
      { name: 'status', type: 'select', options: { values: ['pending', 'sent', 'error'] } },
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },

  // 6. İŞ TAMAMLAMALAR (Job Completion Reports)
  {
    name: 'job_completions',
    type: 'base',
    schema: [
      { name: 'hizmet_no', type: 'text', required: false },
      { name: 'is_tipi', type: 'select', options: { values: ['ARIZA', 'TESIS'] } },
      { name: 'is_adedi', type: 'number', required: false },
      { name: 'ekip_kodu', type: 'text', required: false },
      { name: 'status', type: 'select', options: { values: ['pending', 'sent', 'error'] } },
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },

  // 7. ARAÇ KAYITLARI (Vehicle Logs)
  {
    name: 'vehicle_logs',
    type: 'base',
    schema: [
      { name: 'plaka', type: 'text', required: false },
      { name: 'kilometre', type: 'number', required: false },
      { name: 'ekip_kodu', type: 'text', required: false },
      { name: 'status', type: 'select', options: { values: ['pending', 'sent', 'error'] } },
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },

  // 8. PORT DEĞİŞİMLERİ (Port Change Reports)
  {
    name: 'port_changes',
    type: 'base',
    schema: [
      { name: 'hizmet_no', type: 'text', required: false },
      { name: 'yeni_port', type: 'text', required: false },
      { name: 'yeni_devre', type: 'text', required: false },
      { name: 'aciklama', type: 'text', required: false },
      { name: 'ekip_kodu', type: 'text', required: false },
      { name: 'status', type: 'select', options: { values: ['pending', 'sent', 'error'] } },
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },

  // 9. İYİLEŞTİRME RAPORLARI (Improvement Reports)
  {
    name: 'improvement_reports',
    type: 'base',
    schema: [
      { name: 'yerlesim_adi', type: 'text', required: false },
      { name: 'bakim_tarihi', type: 'text', required: false },
      { name: 'kablo_durumu', type: 'text', required: false },
      { name: 'menhol_durumu', type: 'text', required: false },
      { name: 'direk_durumu', type: 'text', required: false },
      { name: 'direk_donanim', type: 'text', required: false },
      { name: 'kutu_durumu', type: 'text', required: false },
      { name: 'takdir_puani', type: 'number', required: false },
      { name: 'photo', type: 'text', required: false },
      { name: 'location_lat', type: 'number', required: false },
      { name: 'location_lng', type: 'number', required: false },
      { name: 'ekip_kodu', type: 'text', required: false },
      { name: 'status', type: 'select', options: { values: ['pending', 'sent', 'error'] } },
      { name: 'improvement_type', type: 'select', options: { values: ['bildirim', 'imalat'] } },
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },

  // 10. KABLO MALZEME (Cable Material Reports)
  {
    name: 'kablo_materials',
    type: 'base',
    schema: [
      { name: 'action_type', type: 'select', options: { values: ['AL', 'KULLAN', 'DEMONTE'] } },
      { name: 'items', type: 'text', required: false },
      { name: 'ekip_kodu', type: 'text', required: false },
      { name: 'status', type: 'select', options: { values: ['pending', 'sent', 'error'] } },
    ],
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  },
];

async function setupCollections() {
  console.log('🔧 PocketBase Collections Setup\n');
  console.log(`📡 URL: ${POCKETBASE_URL}`);
  console.log(`👤 Admin: ${ADMIN_EMAIL}\n`);
  console.log(`📋 Collections to create: ${collections.length}\n`);

  try {
    // Authenticate as admin
    console.log('🔐 Authenticating as admin...');
    const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Authentication failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✅ Authenticated successfully!\n');

    // Check existing collections
    console.log('📋 Checking existing collections...');
    const collectionsResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
      headers: { Authorization: token },
    });
    const existingCollections = await collectionsResponse.json();
    const existingNames = existingCollections.items?.map((c: any) => c.name) || [];
    console.log(`   Found ${existingCollections.items?.length || 0} existing collections\n`);

    // Create each collection
    let created = 0;
    let skipped = 0;
    
    for (const collection of collections) {
      if (existingNames.includes(collection.name)) {
        console.log(`⏭️  Skipping "${collection.name}" - already exists`);
        skipped++;
        continue;
      }

      console.log(`➕ Creating "${collection.name}"...`);
      
      const createResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify(collection),
      });

      if (createResponse.ok) {
        console.log(`   ✅ "${collection.name}" created successfully!`);
        created++;
      } else {
        const error = await createResponse.text();
        console.log(`   ❌ Failed to create "${collection.name}": ${error}`);
      }
    }

    console.log('\n✨ Setup complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Created: ${created}`);
    console.log(`   - Skipped (existing): ${skipped}`);
    console.log(`   - Total collections: ${collections.length}\n`);
    console.log('📝 All collections:');
    collections.forEach(c => {
      const status = existingNames.includes(c.name) ? '(existing)' : '(new)';
      console.log(`   - ${c.name} ${status}`);
    });

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nMake sure:');
    console.error('   1. PocketBase is running');
    console.error('   2. Admin credentials are correct');
    console.error('   3. Environment variables are set if using custom values');
    process.exit(1);
  }
}

// Export JSON for manual import
function exportJson() {
  console.log('\n📄 JSON Export for Manual Import:\n');
  console.log('Copy the following JSON and import it in PocketBase Admin > Settings > Import Collections:\n');
  console.log(JSON.stringify(collections, null, 2));
}

// Export collections list
function listCollections() {
  console.log('\n📋 Collections List:\n');
  collections.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name}`);
  });
}

// Run
const args = process.argv.slice(2);
if (args.includes('--json')) {
  exportJson();
} else if (args.includes('--list')) {
  listCollections();
} else {
  setupCollections();
}
