// ============================================================
// VERI MİGRASYONU: Sporcu Bazlı Birleştirme (Consolidate)
// ============================================================
// Bu script, aynı tarih ve protokol için ayrı ayrı kaydedilmiş
// sporcuları tek bir session'da birleştirir.
//
// Kullanım:
//   1. test_kayitlari.html'i tarayıcıda aç
//   2. F12 → Console tab açır
//   3. Bu dosyanın içeriğini kopyala-yapıştır
//   4. Enter'e bas
//   5. consoleSummary() sonuçlarını incele
// ============================================================

async function consolidateAthletesByDateAndProtocol(){
  const summary = {
    originalSessionCount: 0,
    consolidatedSessionCount: 0,
    totalAthletesMoved: 0,
    protocolsAffected: [],
    removedSessionIds: [],
    modifiedSessionIds: [],
  };

  if(!MANUAL || !MANUAL.sessions) {
    console.error('MANUAL.sessions bulunamadı. Dosya doğru yüklendi mi?');
    return summary;
  }

  summary.originalSessionCount = MANUAL.sessions.length;
  console.log('🔍 Başlangıç: Toplam', summary.originalSessionCount, 'session');

  // Protokol ve tarih kombinasyonuna göre session'ları grupla
  const groupedByDateAndProto = {};
  MANUAL.sessions.forEach(s => {
    const key = `${s.templateId}|${s.date}`;
    if(!groupedByDateAndProto[key]) {
      groupedByDateAndProto[key] = [];
    }
    groupedByDateAndProto[key].push(s);
  });

  console.log('📊 Farklı (protokol, tarih) kombinasyonları:', Object.keys(groupedByDateAndProto).length);

  // Her grupta birden fazla session varsa birleştir
  Object.entries(groupedByDateAndProto).forEach(([key, sessions]) => {
    if(sessions.length === 1) return; // Zaten birleştirilmiş

    const [templateId, date] = key.split('|');
    const proto = MANUAL.templates?.find(t => t.id === templateId);
    const protoName = proto?.name || 'Bilinmeyen';

    console.log(`\n🔗 Birleştiriliyor: ${protoName} (${date}) — ${sessions.length} session → 1 session`);

    // İsim eşleştirmesi: baştaki/sondaki boşluk ve büyük/küçük harf
    // farkları aynı sporcuyu ayrı göstermesin.
    const nameKey = (v) => (v || '').toString().trim().toLocaleLowerCase('tr');
    // Bir satırın "dolu" alan sayısı — çakışmada hangi kaydın daha çok
    // veri taşıdığına karar vermek için.
    const filledCount = (row) => Object.keys(row || {}).filter(k => {
      if(k === 'athlete') return false;
      const val = row[k];
      return val !== null && val !== undefined && String(val).trim() !== '';
    }).length;
    // Çakışan iki satırı birleştir: her alanda dolu olanı koru,
    // ikisi de doluysa mevcut (ana) değeri bırak.
    const mergeRows = (base, extra) => {
      const out = { ...extra, ...base };
      Object.keys(extra || {}).forEach(k => {
        const cur = base[k];
        if(cur === null || cur === undefined || String(cur).trim() === ''){
          out[k] = extra[k];
        }
      });
      return out;
    };

    // İlk session'ı ana session olarak kullan
    const mainSession = sessions[0];
    let allAthletes = [...(mainSession.athletes || [])];
    const indexByName = new Map();
    allAthletes.forEach((a, i) => indexByName.set(nameKey(a.athlete), i));

    // Diğer session'ların atlet verilerini ekle (isim-normalize duplicate kontrol ile)
    sessions.slice(1).forEach((s) => {
      s.athletes?.forEach(a => {
        const key = nameKey(a.athlete);
        const existingIdx = indexByName.get(key);
        if(existingIdx === undefined) {
          indexByName.set(key, allAthletes.length);
          allAthletes.push(a);
          summary.totalAthletesMoved++;
          console.log(`  ✓ Eklendi: "${a.athlete}"`);
        } else {
          const existing = allAthletes[existingIdx];
          const merged = mergeRows(existing, a);
          const gained = filledCount(merged) - filledCount(existing);
          allAthletes[existingIdx] = merged;
          console.log(gained > 0
            ? `  ⊕ Birleştirildi: "${a.athlete}" (+${gained} alan dolduruldu)`
            : `  ⊘ Zaten var: "${a.athlete}" (ek veri yok)`);
        }
      });
    });

    // Ana session'ı güncelle
    mainSession.athletes = allAthletes;
    summary.modifiedSessionIds.push(mainSession.id);
    console.log(`  → Güncellenmiş: ${mainSession.id} (${allAthletes.length} sporcu)`);

    // Diğer session'ları sil
    sessions.slice(1).forEach(s => {
      summary.removedSessionIds.push(s.id);
      console.log(`  ✕ Siliniyor: ${s.id}`);
    });

    // Protokol adını ve tarihi kayıt et
    if(!summary.protocolsAffected.find(p => p.name === protoName)) {
      summary.protocolsAffected.push({ name: protoName, date, sessionCount: sessions.length });
    }
  });

  // Silinecek session'ları gerçekten sil
  MANUAL.sessions = MANUAL.sessions.filter(s => !summary.removedSessionIds.includes(s.id));
  summary.consolidatedSessionCount = MANUAL.sessions.length;

  console.log('\n====== MİGRASYON ÖZETİ ======');
  console.log('Başlangıç:', summary.originalSessionCount, 'session');
  console.log('Sonuç:', summary.consolidatedSessionCount, 'session');
  console.log('Birleştirilmiş:', summary.originalSessionCount - summary.consolidatedSessionCount, 'session');
  console.log('Taşınan atlet:', summary.totalAthletesMoved);
  console.log('Etkilenen Protokoller:', summary.protocolsAffected.map(p => `${p.name} (${p.sessionCount} session birleşti)`).join(', '));

  return summary;
}

async function applyCachedConsolidation() {
  console.log('\n🚀 Sporcu birleştirmesi başlatılıyor...\n');
  const summary = await consolidateAthletesByDateAndProtocol();

  if(summary.removedSessionIds.length === 0) {
    console.log('ℹ️  Birleştirilecek veri yok — veriler zaten uyumlu.');
    return summary;
  }

  console.log('\n💾 Veriler kaydediliyor...');
  await saveManual();

  console.log('✅ Başarıyla kaydedildi!');
  console.log('\n🔄 Sayfayı yenile ve verilerinizi kontrol edin.');

  return summary;
}

// ============================================================
// KUL​LANIM: Console'da şu komutu çalıştır:
// applyCachedConsolidation()
// ============================================================

console.log('%c📋 Sporcu Bazlı Birleştirme Scripti Yüklendi', 'font-size:14px; font-weight:bold; color:#0b2942;');
console.log('Kullanım: applyCachedConsolidation()');
