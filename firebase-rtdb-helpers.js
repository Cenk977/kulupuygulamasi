/* ============================================================
   ORTAK Firebase Realtime Database REST YARDIMCILARI
   ------------------------------------------------------------
   test_kayitlari.html, sporcu_goruntule.html ve index.html (Test
   Kayıtları yedekleme modülü) bu dosyayı ortak kullanır — timeout,
   hata kodu ve auth-token ekleme mantığı tek yerden yönetilir,
   kopyalar birbirinden sapmaz (bkz. index.html'de daha önce
   testKayitRtdbSet'in auth token eklemeyi unutması hatası).

   Bilerek FIREBASE_CONFIG / RTDB_BASE gibi sabitleri BURADA
   TANIMLAMIYORUZ — her dosya kendi FIREBASE_CONFIG'ini zaten
   tutuyor (index.html'de bu isim başka bir amaçla da kullanılıyor;
   burada ikinci bir "const FIREBASE_CONFIG" tanımlamak isim
   çakışmasıyla sayfayı bozardı). Bunun yerine her fonksiyon
   veritabanı adresini ("base") ve varsa auth query-string'ini
   ("authParam", örn. "?auth=xxx") parametre olarak alır — asıl
   tekrar eden ve hataya açık olan kısım zaten bu mantıktı, sabit
   config değeri değil.
   ============================================================ */
function rtdbFetchWithTimeout(url, options, ms){
  const controller = new AbortController();
  const timer = setTimeout(()=> controller.abort(), ms || 8000);
  return fetch(url, { ...options, signal: controller.signal }).finally(()=> clearTimeout(timer));
}

async function rtdbGetShared(base, path, authParam){
  if(!base) return null;
  const res = await rtdbFetchWithTimeout(`${base}/${path}.json${authParam || ''}`);
  if(!res.ok){
    const err = new Error(`RTDB GET ${res.status}`);
    err.code = (res.status===401 || res.status===403) ? 'PERMISSION_DENIED' : String(res.status);
    throw err;
  }
  return res.json();
}

async function rtdbSetShared(base, path, value, authParam){
  if(!base) return;
  const res = await rtdbFetchWithTimeout(`${base}/${path}.json${authParam || ''}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
  if(!res.ok){
    const err = new Error(`RTDB PUT ${res.status}`);
    err.code = (res.status===401 || res.status===403) ? 'PERMISSION_DENIED' : String(res.status);
    throw err;
  }
  return res.json();
}
