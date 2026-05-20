/* =====================================================
   CAMPEÃO STORE — Firebase Config

   INSTRUÇÕES:
   1. Acesse https://console.firebase.google.com
   2. Clique em "Adicionar projeto" → dê um nome → Criar
   3. Na tela do projeto clique em "</>" (Web App) → registre o app
   4. Copie os valores do firebaseConfig e cole abaixo
   5. No menu lateral: Build → Firestore Database → Criar banco
      Escolha modo "Teste" por agora (regras abertas por 30 dias)
   6. Pronto! Os pedidos vão aparecer em:
      Firestore → Collection "pedidos"
   ===================================================== */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBKme-Y0Gn_6fFX4fJPA2v8XlH7Hm4veyM",
  authDomain:        "campeaostore01-a2c2d.firebaseapp.com",
  projectId:         "campeaostore01-a2c2d",
  storageBucket:     "campeaostore01-a2c2d.firebasestorage.app",
  messagingSenderId: "306350146306",
  appId:             "1:306350146306:web:d4a23faa7c02ee78a4b81b",
  measurementId:     "G-6Y68EP8Q2G"
};

// ---- Inicialização ------------------------------------
let db = null;
let auth = null;
let firebaseReady = false;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('[Firebase] SDK não carregado — pedidos salvos só localmente.');
      return false;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db   = firebase.firestore();
    auth = firebase.auth();
    firebaseReady = true;
    console.log('[Firebase] Conectado com sucesso ✅');
    return true;
  } catch (e) {
    console.warn('[Firebase] Erro ao inicializar:', e.message);
    return false;
  }
}

// ---- Salvar pedido no Firestore ----------------------
async function salvarPedidoFirebase(order) {
  if (!firebaseReady || !db) return null;
  try {
    const docRef = await db.collection('pedidos').add({
      ...order,
      status: 'novo',
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('[Firebase] Pedido salvo:', docRef.id);
    return docRef.id;
  } catch (e) {
    console.warn('[Firebase] Erro ao salvar pedido:', e.message);
    return null;
  }
}

// ---- Buscar todos os pedidos (admin) -----------------
async function buscarPedidos(limite = 100) {
  if (!firebaseReady || !db) return [];
  try {
    const snap = await db.collection('pedidos')
      .orderBy('criadoEm', 'desc')
      .limit(limite)
      .get();
    return snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firebase] Erro ao buscar pedidos:', e.message);
    return [];
  }
}

// ---- Atualizar status do pedido (admin) --------------
async function atualizarStatusPedido(firestoreId, novoStatus) {
  if (!firebaseReady || !db) return false;
  try {
    await db.collection('pedidos').doc(firestoreId).update({
      status: novoStatus,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (e) {
    console.warn('[Firebase] Erro ao atualizar status:', e.message);
    return false;
  }
}

// ---- Login admin (Firebase Auth) ---------------------
async function loginAdmin(email, senha) {
  if (!firebaseReady || !auth) return { ok: false, erro: 'Firebase não inicializado' };
  try {
    await auth.signInWithEmailAndPassword(email, senha);
    return { ok: true };
  } catch (e) {
    const msgs = {
      'auth/wrong-password':    'Senha incorreta.',
      'auth/user-not-found':    'E-mail não cadastrado.',
      'auth/invalid-email':     'E-mail inválido.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.'
    };
    return { ok: false, erro: msgs[e.code] || e.message };
  }
}

async function logoutAdmin() {
  if (auth) await auth.signOut();
}

function onAuthChange(callback) {
  if (!auth) return;
  auth.onAuthStateChanged(callback);
}
