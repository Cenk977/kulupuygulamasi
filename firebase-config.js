/* ============================================================
   ORTAK Firebase yapılandırması
   ------------------------------------------------------------
   index.html, test_kayitlari.html ve sporcu_goruntule.html bu
   dosyayı <script src="firebase-config.js"></script> ile,
   kendi ana <script> bloklarından ÖNCE yükler. Böylece config
   tek yerde durur — üç dosyada kopya tutulup birbirinden
   sapmaz.

   Not: klasik script'te tanımlanan bu `const`, kendisinden
   SONRA gelen diğer <script> bloklarından okunabilir.
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDutbYjC6ysODycjv7Tqd580LckBacrmWI",
  authDomain:        "bursa-kolejliler.firebaseapp.com",
  databaseURL:       "https://bursa-kolejliler-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "bursa-kolejliler",
  storageBucket:     "bursa-kolejliler.firebasestorage.app",
  messagingSenderId: "905222390930",
  appId:             "1:905222390930:web:e5980ea9076dcab0fb924b"
};
