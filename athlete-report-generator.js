// ============================================================
// SPORCU GELİŞİM RAPOR ÜRETEÇ (Athlete Development Report)
// ============================================================
// Test verilerine bakarak ATALAY ve diğer sporcular için
// performans analizi ve düşünceler üretir.
//
// Kullanım: generateAthleteReport('ATALAY BİLECİKLİ')
// ============================================================

function findSessionsForAthlete(athleteName) {
  if (!MANUAL || !MANUAL.sessions) return { ayak: [], tekrarli: [] };

  const result = { ayak: [], tekrarli: [], kumulatif: [] };

  MANUAL.sessions.forEach(session => {
    const proto = MANUAL.templates?.find(t => t.id === session.templateId);
    if (!proto) return;

    const athlete = session.athletes?.find(a => a.athlete === athleteName);
    if (!athlete) return;

    if (proto.family === 'ayak') {
      result.ayak.push({ ...session, athlete, proto });
    } else if (proto.family === 'tekrarli') {
      result.tekrarli.push({ ...session, athlete, proto });
    } else if (proto.family === 'kumulatif') {
      result.kumulatif.push({ ...session, athlete, proto });
    }
  });

  // Her kategoriyi tarihe göre sırala
  result.ayak.sort((a, b) => a.date.localeCompare(b.date));
  result.tekrarli.sort((a, b) => a.date.localeCompare(b.date));
  result.kumulatif.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

function parseTimeStr(str) {
  if (str == null) return null;
  const s = String(str).trim().replace(',', '.');
  if (!s) return null;
  // "M:SS", "M:SS.c", "M:SS.cc"
  let m = s.match(/^(\d+):(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (m) {
    const cs = m[3] ? parseInt(m[3].padEnd(2, '0'), 10) : 0;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + cs / 100;
  }
  // Dakikasız girilen dereceler: "38.60", "38", "9.5"
  m = s.match(/^(\d+(?:\.\d{1,2})?)$/);
  if (m) return parseFloat(m[1]);
  return null;
}

function fmtTime(sec) {
  if (sec === null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.round((sec % 1) * 100);
  return `${m}:${s.toString().padStart(2, '0')}${cs > 0 ? '.' + cs.toString().padStart(2, '0') : ''}`;
}

function computeAyakAvg(row) {
  // Farklı mesafeleri karşılaştırılabilir kılmak için her dereceyi
  // 100m'lik tempoya indirger, sonra ortalamasını alır (düz süre
  // ortalaması farklı mesafelerde anlamsız olurdu).
  const paces = [
    [parseTimeStr(row.d400), 4],
    [parseTimeStr(row.d200), 2],
    [parseTimeStr(row.d100), 1],
    [parseTimeStr(row.d50), 0.5]
  ].filter(([s]) => s !== null).map(([s, units]) => s / units);

  if (paces.length === 0) return null;
  return paces.reduce((a, b) => a + b, 0) / paces.length;
}

function analyze24x100(sessions) {
  const results = [];

  sessions.forEach(session => {
    const proto = session.proto;
    const athlete = session.athlete;

    if (proto.family !== 'tekrarli' || proto.config.dist !== 100) return;

    // Tüm repetisyonları bul ve sırala
    const reps = [];
    for (let i = 1; i <= 24; i++) {
      const sec = parseTimeStr(athlete[`rep${i}`]);
      if (sec !== null) reps.push({ rep: i, sec });
    }

    if (reps.length === 0) return;

    const avgSec = reps.reduce((a, b) => a + b.sec, 0) / reps.length;

    // Split analizi: ilk 6 vs son 6
    const first6 = reps.slice(0, 6);
    const last6 = reps.slice(-6);

    const first6Avg = first6.reduce((a, b) => a + b.sec, 0) / first6.length;
    const last6Avg = last6.reduce((a, b) => a + b.sec, 0) / last6.length;
    const splitDiff = last6Avg - first6Avg;
    const splitPercent = (splitDiff / first6Avg) * 100;

    results.push({
      date: session.date,
      note: session.note,
      reps: reps.length,
      avgSec,
      first6Avg,
      last6Avg,
      splitDiff,
      splitPercent,
      allReps: reps
    });
  });

  return results;
}

function analyzeAyakTest(sessions) {
  const results = [];

  sessions.forEach(session => {
    const athlete = session.athlete;

    const d400 = parseTimeStr(athlete.d400);
    const d200 = parseTimeStr(athlete.d200);
    const d100 = parseTimeStr(athlete.d100);
    const d50 = parseTimeStr(athlete.d50);

    if (d400 === null) return;

    results.push({
      date: session.date,
      d400, d200, d100, d50,
      avg: computeAyakAvg(athlete)
    });
  });

  return results;
}

function generateAthleteReport(athleteName) {
  console.log('\n' + '='.repeat(70));
  console.log(`📊 SPORCU RAPORU: ${athleteName}`);
  console.log('='.repeat(70) + '\n');

  const sessions = findSessionsForAthlete(athleteName);

  if (sessions.tekrarli.length === 0 && sessions.ayak.length === 0) {
    console.log(`❌ ${athleteName} için test kaydı bulunamadı.\n`);
    return;
  }

  // 24×100 analizi
  if (sessions.tekrarli.length > 0) {
    console.log('\n📈 24×100 SERBEST TESTİ (Aerobik Dayanıklılık)\n');

    const results24x100 = analyze24x100(sessions.tekrarli);

    if (results24x100.length === 0) {
      console.log('⚠️  24×100 verisi bulunamadı.\n');
    } else {
      results24x100.forEach((r, idx) => {
        console.log(`Tarih: ${new Date(r.date).toLocaleDateString('tr-TR')}`);
        console.log(`  Ortalama: ${fmtTime(r.avgSec)}`);
        console.log(`  İlk 6:    ${fmtTime(r.first6Avg)}`);
        console.log(`  Son 6:    ${fmtTime(r.last6Avg)}`);
        console.log(`  Split:    ${r.splitDiff > 0 ? '+' : ''}${fmtTime(r.splitDiff)} (${r.splitPercent.toFixed(1)}%)`);

        if (r.splitPercent < 2) {
          console.log(`  ✓ GÜÇLÜ: Çok kararlı pacing, dayanıklılık iyi`);
        } else if (r.splitPercent < 5) {
          console.log(`  → NORMAL: Hafif yorulma, beklenen`);
        } else if (r.splitPercent < 10) {
          console.log(`  ⚠️  ZAYıF: Önemli yorulma, tempo kontrol gerekli`);
        } else {
          console.log(`  ❌ KÖTÜ: Ciddi dayanıklılık sorunu`);
        }

        if (r.avgSec < 80) { // < 1:20
          console.log(`  🔥 ÇOK İYİ AEROBIK KAPASITE`);
        } else if (r.avgSec < 95) { // < 1:35
          console.log(`  ✓ İYİ AEROBIK KAPASITE`);
        } else if (r.avgSec < 110) { // < 1:50
          console.log(`  → ORTA KAPASITE (gelişim var)`);
        } else {
          console.log(`  ⚠️  DÜŞÜK KAPASITE (yoğun çalışma gerekli)`);
        }

        if (idx > 0) {
          const prev = results24x100[idx - 1];
          const improvement = prev.avgSec - r.avgSec;
          if (improvement > 1) {
            console.log(`  📈 Önceki testten ${fmtTime(Math.abs(improvement))} İYİLEŞME`);
          } else if (improvement < -1) {
            console.log(`  📉 Önceki testten ${fmtTime(Math.abs(improvement))} DÜŞÜŞ`);
          }
        }

        console.log('');
      });

      // Trend analizi
      if (results24x100.length > 1) {
        const last = results24x100[results24x100.length - 1];
        const first = results24x100[0];
        const trend = first.avgSec - last.avgSec;

        console.log(`📊 TREND (${first.date.slice(0, 10)} → ${last.date.slice(0, 10)}):`);
        if (trend > 2) {
          console.log(`  ✓ ${fmtTime(trend)} GELİŞİM GÖRÜLDÜ`);
        } else if (trend > -2) {
          console.log(`  → STABIL, ŞU ANLIK SONUÇ KORUMA AŞAMASINDA`);
        } else {
          console.log(`  ❌ ${fmtTime(Math.abs(trend))} DÜŞÜŞ, ARAŞTIRMA GEREKLİ`);
        }
        console.log('');
      }
    }
  }

  // Ayak Test analizi
  if (sessions.ayak.length > 0) {
    console.log('\n🦶 AYAK TESTİ (400/200/100/50m)\n');

    const resultsAyak = analyzeAyakTest(sessions.ayak);

    resultsAyak.forEach((r, idx) => {
      console.log(`Tarih: ${new Date(r.date).toLocaleDateString('tr-TR')}`);
      console.log(`  400m: ${fmtTime(r.d400)}`);
      console.log(`  200m: ${fmtTime(r.d200)}`);
      console.log(`  100m: ${fmtTime(r.d100)}`);
      console.log(`  50m:  ${fmtTime(r.d50)}`);
      console.log(`  Ort. 100m tempo: ${fmtTime(r.avg)}`);

      if (r.d400 < 380) { // < 6:20
        console.log(`  ✓ ÇOK GÜÇLÜ bacak dayanıklılığı`);
      } else if (r.d400 < 420) { // < 7:00
        console.log(`  ✓ İYİ bacak gücü`);
      } else {
        console.log(`  → ORTA bacak gücü (çalışılabilir)`);
      }

      console.log('');
    });
  }

  // Bağlantı analizi
  if (sessions.ayak.length > 0 && sessions.tekrarli.length > 0) {
    console.log('\n🔗 BAĞLANTI ANALİZİ (Ayak Test ↔ 24×100)\n');

    const all24x100 = analyze24x100(sessions.tekrarli);
    const allAyak = analyzeAyakTest(sessions.ayak);
    const last24x100 = all24x100[all24x100.length - 1];
    const lastAyak = allAyak[allAyak.length - 1];

    if (!last24x100 || !lastAyak) {
      console.log('→ Yeterli veri yok (bir testte hiç geçerli derece bulunamadı).');
    } else if (lastAyak.d400 < 400 && last24x100.avgSec < 95) {
      console.log('✓ UYUMLU: Hem ayak gücü hem 24×100 kapasite iyi');
      console.log('  → Alt vücut & aerobik koordinasyonu başarılı');
    } else if (lastAyak.d400 < 400 && last24x100.avgSec > 110) {
      console.log('⚠️  UYUMSUZLUK: Ayak güçlü AMA 24×100 zayıf');
      console.log('  → Sorun: Kol efficient, breathing pattern, ya da teknik');
      console.log('  → Çözüm: Drill work (breathing + body position)');
    } else if (lastAyak.d400 > 420 && last24x100.avgSec < 95) {
      console.log('⚠️  UYUMSUZLUK: Ayak zayıf AMA 24×100 iyi');
      console.log('  → Garip! Bacak gücü kontrol et (ölçüm hatası?), pacing strateji');
    } else {
      console.log('→ NORMAL UYUM, her ikisi orta seviye');
    }
    console.log('');
  }

  console.log('='.repeat(70) + '\n');
}

// ============================================================
// KULLANIM ÖRNEKLERI:
//
// generateAthleteReport('ATALAY BİLECİKLİ')
// generateAthleteReport('SPORCU ADI')
//
// TÜM SPORCULAR:
// const athletes = knownAthletes();
// athletes.forEach(a => generateAthleteReport(a));
// ============================================================

console.log('%c🏊 Sporcu Gelişim Rapor Üreteci Yüklendi', 'font-size:12px; font-weight:bold; color:#0f7c8c;');
console.log('Kullanım: generateAthleteReport("ATALAY BİLECİKLİ")');
