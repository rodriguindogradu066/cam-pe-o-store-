/* =====================================================
   CAMPEÃO STORE — App JS
   ===================================================== */

// ---- Configuração — troque os números aqui -------------
const WA_SUPORTE1 = '5563992795579';
const WA_SUPORTE2 = '5563991227871';
const WA_DONO1    = '5563992795579';
const WA_DONO2    = '5563991227871';

// ---- Google Sheets (banco de dados) --------------------
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzpSlR4q5pbU-kOGsoZpGL8-qr6VgPmgsy4BTB3-i0OQYZKziiGZpyDKVgBBrNoPPm9/exec';

async function salvarPedidoSheets(order) {
  try {
    // Compacta só os dados essenciais para caber na URL
    const d = {
      num:    order.num,
      data:   order.data,
      nome:   order.nome,
      tel:    order.telefone,
      email:  order.email,
      itens:  (order.items||[]).map(i => i.name+' x'+i.qty).join(' | '),
      custom: (order.items||[]).map(i => {
        if (!i.custom) return '';
        return Object.entries(i.custom).filter(([,v])=>v).map(([k,v])=>k+': '+v).join(', ');
      }).filter(Boolean).join(' | '),
      total:  (order.total||0).toFixed(2),
      frete:  order.subtotal >= 150 ? 'GRATIS' : 'R$19,90',
      pag:    order.payment || '-',
      cep:    order.cep || '-',
      end:    (order.rua||'') + (order.numero ? ', '+order.numero : ''),
      cidade: (order.cidade||'') + '/' + (order.estado||'')
    };
    // Envia via GET com imagem — sem bloqueio de CORS
    const url = SHEETS_URL + '?dados=' + encodeURIComponent(JSON.stringify(d));
    const ping = new Image();
    ping.src = url;
    console.log('[Sheets] Pedido enviado ✅');
    return true;
  } catch(e) {
    console.warn('[Sheets]', e.message);
    return false;
  }
}

// ---- Cart State ----------------------------------------
const CART_KEY = 'campeao_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id && JSON.stringify(i.custom) === JSON.stringify(product.custom));
  if (existing) {
    existing.qty += product.qty || 1;
  } else {
    cart.push({ ...product, qty: product.qty || 1 });
  }
  saveCart(cart);
  updateCartUI();
  showToast('Produto adicionado ao carrinho! 🛒', 'success');
  openCartSidebar();
}

function removeFromCart(id, customStr) {
  const cart = getCart().filter(i => !(i.id === id && JSON.stringify(i.custom) === customStr));
  saveCart(cart);
  updateCartUI();
  renderCartSidebar();
  if (document.querySelector('.cart-table')) renderCartPage();
}

function updateQty(id, customStr, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id && JSON.stringify(i.custom) === customStr);
  if (item) {
    item.qty = Math.max(1, item.qty + delta);
    saveCart(cart);
    updateCartUI();
    renderCartSidebar();
    if (document.querySelector('.cart-table')) renderCartPage();
  }
}

function getCartTotal() {
  return getCart().reduce((s, i) => s + i.price * i.qty, 0);
}
function getCartCount() {
  return getCart().reduce((s, i) => s + i.qty, 0);
}

function updateCartUI() {
  const count = getCartCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ---- Cart Sidebar ----------------------------------------
function openCartSidebar() {
  document.querySelector('.cart-sidebar')?.classList.add('open');
  document.querySelector('.cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCartSidebar();
}
function closeCartSidebar() {
  document.querySelector('.cart-sidebar')?.classList.remove('open');
  document.querySelector('.cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartSidebar() {
  const items = getCart();
  const itemsContainer = document.querySelector('.cart-sidebar-items');
  const footerEl = document.querySelector('.cart-sidebar-footer');
  if (!itemsContainer) return;

  if (items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-basket"></i>
        <p>Seu carrinho está vazio</p>
        <a href="produtos.html" class="btn btn-primary btn-sm">Ver Produtos</a>
      </div>`;
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  if (footerEl) footerEl.style.display = 'block';
  itemsContainer.innerHTML = items.map(item => `
    <div class="mini-cart-item">
      <div class="mini-cart-img ${item.bgClass}">${item.emoji}</div>
      <div class="mini-cart-info">
        <div class="mini-cart-name">${item.name}</div>
        ${item.custom && Object.keys(item.custom).length ? `<div class="mini-cart-custom">${formatCustom(item.custom)}</div>` : ''}
        <div class="mini-cart-price">R$ ${(item.price * item.qty).toFixed(2).replace('.',',')} <span style="font-size:.75rem;color:#999">(${item.qty}x)</span></div>
      </div>
      <button class="mini-cart-remove" onclick="removeFromCart('${item.id}', '${JSON.stringify(item.custom).replace(/'/g,"\\'")}')">
        <i class="fas fa-times"></i>
      </button>
    </div>`).join('');

  document.querySelector('.cart-total-line strong').textContent = `R$ ${getCartTotal().toFixed(2).replace('.',',')}`;
}

function formatCustom(custom) {
  return Object.entries(custom).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(' · ');
}

// ---- Cart Page -------------------------------------------
function renderCartPage() {
  const items = getCart();
  const tbody = document.querySelector('.cart-items-body');
  const emptyState = document.querySelector('.cart-empty-state');
  const cartTableWrap = document.querySelector('.cart-table');
  const cartSummaryWrap = document.querySelector('.cart-summary');
  if (!tbody) return;

  if (items.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (cartTableWrap) cartTableWrap.style.display = 'none';
    if (cartSummaryWrap) cartSummaryWrap.style.display = 'none';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';
  if (cartTableWrap) cartTableWrap.style.display = 'block';
  if (cartSummaryWrap) cartSummaryWrap.style.display = 'block';

  tbody.innerHTML = items.map(item => {
    const customStr = JSON.stringify(item.custom).replace(/'/g,"\\'");
    return `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-img ${item.bgClass}">${item.emoji}</div>
        <div>
          <div class="cart-item-name">${item.name}</div>
          ${item.custom && Object.keys(item.custom).length ? `<div class="cart-item-custom">${formatCustom(item.custom)}</div>` : ''}
        </div>
      </div>
      <div class="cart-item-price">R$ ${item.price.toFixed(2).replace('.',',')}</div>
      <div class="qty-control">
        <button onclick="updateQty('${item.id}','${customStr}',-1)"><i class="fas fa-minus"></i></button>
        <input type="number" value="${item.qty}" min="1" readonly>
        <button onclick="updateQty('${item.id}','${customStr}',1)"><i class="fas fa-plus"></i></button>
      </div>
      <div class="cart-item-subtotal">R$ ${(item.price * item.qty).toFixed(2).replace('.',',')}</div>
      <button class="cart-remove" onclick="removeFromCart('${item.id}','${customStr}')"><i class="fas fa-trash"></i></button>
    </div>`;
  }).join('');

  const subtotal = getCartTotal();
  const shipping = subtotal >= 150 ? 0 : 19.90;
  const total = subtotal + shipping;
  const pix = total * 0.9;

  document.querySelector('.summary-subtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.',',')}`;
  document.querySelector('.summary-shipping').textContent = shipping === 0 ? 'GRÁTIS' : `R$ ${shipping.toFixed(2).replace('.',',')}`;
  document.querySelector('.summary-total').textContent = `R$ ${total.toFixed(2).replace('.',',')}`;
  document.querySelector('.summary-pix').textContent = `R$ ${pix.toFixed(2).replace('.',',')} no PIX`;
}

// ---- Toast -----------------------------------------------
function showToast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---- Gerar número de pedido ----------------------------
function gerarNumeroPedido() {
  return 'CS-' + Date.now().toString().slice(-5) + Math.floor(Math.random() * 10);
}

// ---- Montar mensagem para DONO (você) ------------------
function montarMsgDono(order) {
  const itens = order.items.map(i => {
    const custom = i.custom && Object.keys(i.custom).filter(k => i.custom[k]).length
      ? `\n     Personalização: ${formatCustom(i.custom)}`
      : '';
    return `• ${i.name} x${i.qty} — R$ ${(i.price * i.qty).toFixed(2).replace('.',',')}${custom}`;
  }).join('\n');

  const pagamento = order.payment || 'Não informado';
  const frete = order.subtotal >= 150 ? 'GRÁTIS' : 'R$ 19,90';

  return `🛍️ *NOVO PEDIDO #${order.num}*

👤 *Cliente:* ${order.nome}
📱 *WhatsApp:* ${order.telefone}
📧 *E-mail:* ${order.email}

📍 *Endereço de entrega:*
${order.rua}${order.numero ? ', ' + order.numero : ''}${order.complemento ? ' - ' + order.complemento : ''}
${order.bairro} — ${order.cidade}/${order.estado}
CEP: ${order.cep}

📦 *Produtos:*
${itens}

💰 *Subtotal:* R$ ${order.subtotal.toFixed(2).replace('.',',')}
🚚 *Frete:* ${frete}
💵 *TOTAL:* R$ ${order.total.toFixed(2).replace('.',',')}
💳 *Pagamento:* ${pagamento}

⏰ *Pedido em:* ${order.data}

_Responda esta mensagem para confirmar o pedido._`;
}

// ---- Montar mensagem para CLIENTE (acompanhar) ---------
function montarMsgCliente(order) {
  const itens = order.items.map(i =>
    `• ${i.name} x${i.qty}`
  ).join('\n');

  return `Olá! 👋 Quero acompanhar meu pedido.

📦 *Pedido:* #${order.num}
👤 *Nome:* ${order.nome}
📅 *Data:* ${order.data}

🛍️ *Itens:*
${itens}

💰 *Total pago:* R$ ${order.total.toFixed(2).replace('.',',')}

Poderia me informar o status da entrega? Obrigado!`;
}

// ---- Checkout Submission --------------------------------
function initCheckoutForm() {
  const submitBtn = document.querySelector('.checkout-submit');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', e => {
    e.preventDefault();

    // Validação dos campos obrigatórios
    const required = document.querySelectorAll('[required]');
    let valid = true;
    required.forEach(el => {
      if (!el.value.trim()) {
        el.style.borderColor = 'var(--red)';
        el.style.boxShadow = '0 0 0 3px rgba(232,25,44,.15)';
        valid = false;
        el.addEventListener('input', () => {
          el.style.borderColor = '';
          el.style.boxShadow = '';
        }, { once: true });
      }
    });
    if (!valid) { showToast('Preencha todos os campos obrigatórios', 'error'); return; }

    // Coletar dados do formulário
    const nome     = document.getElementById('nome')?.value || '';
    const email    = document.getElementById('email')?.value || '';
    const telefone = document.querySelector('[data-mask="phone"]')?.value || '';
    const cep      = document.getElementById('cep')?.value || '';
    const rua      = document.getElementById('rua')?.value || '';
    const numero   = document.querySelector('input[placeholder="123"]')?.value || '';
    const complemento = document.querySelector('input[placeholder="Apto 42, Bloco B"]')?.value || '';
    const bairro   = document.getElementById('bairro')?.value || '';
    const cidade   = document.getElementById('cidade')?.value || '';
    const estado   = document.getElementById('estado')?.value || '';
    const activeTab = document.querySelector('.payment-tab.active');
    const payment  = activeTab?.textContent?.trim().replace(/\s+/g,' ').split(' ')[0] || 'PIX';

    const cart     = getCart();
    const subtotal = getCartTotal();
    const shipping = subtotal >= 150 ? 0 : 19.90;
    const total    = subtotal + shipping;
    const agora    = new Date();
    const data     = agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});

    const order = {
      num: gerarNumeroPedido(),
      nome, email, telefone,
      cep, rua, numero, complemento, bairro, cidade, estado,
      payment, items: cart, subtotal, shipping, total, data
    };

    // 1. Salvar no localStorage (backup local sempre)
    localStorage.setItem('ultimo_pedido', JSON.stringify(order));
    const historico = JSON.parse(localStorage.getItem('historico_pedidos') || '[]');
    historico.push(order);
    localStorage.setItem('historico_pedidos', JSON.stringify(historico));

    // 2. Salvar no Google Sheets
    salvarPedidoSheets(order);

    showToast('Pedido confirmado! Abrindo WhatsApp...', 'success');

    // Notificar o DONO via WhatsApp com todos os dados
    const msgDono = montarMsgDono(order);
    setTimeout(() => {
      window.open(`https://wa.me/${WA_DONO1}?text=${encodeURIComponent(msgDono)}`, '_blank');
    }, 800);

    // Redirecionar para página de confirmação
    setTimeout(() => {
      saveCart([]);
      updateCartUI();
      window.location.href = 'obrigado.html';
    }, 1800);
  });
}

// ---- Página de confirmação (obrigado.html) --------------
function initObrigado() {
  if (!document.querySelector('.success-icon')) return;

  const order = JSON.parse(localStorage.getItem('ultimo_pedido') || '{}');
  if (!order.num) return;

  // Preencher número e data do pedido
  const numEl = document.getElementById('order-num');
  const dateEl = document.getElementById('order-date');
  if (numEl) numEl.textContent = '#' + order.num;
  if (dateEl) dateEl.textContent = order.data || '';

  // Preencher nome do cliente no título
  const title = document.querySelector('.obrigado-nome');
  if (title && order.nome) title.textContent = order.nome.split(' ')[0] + '!';

  // Montar lista de itens do pedido
  const itemsContainer = document.getElementById('confirmed-items');
  if (itemsContainer && order.items?.length) {
    itemsContainer.innerHTML = order.items.map(item => `
      <div class="order-item">
        <div class="order-item-img ${item.bgClass}">${item.emoji}</div>
        <div class="order-item-info">
          <div class="order-item-name">${item.name}</div>
          ${item.custom && Object.keys(item.custom).filter(k => item.custom[k]).length
            ? `<div class="order-item-custom" style="font-size:.73rem;color:var(--text-muted)">${formatCustom(item.custom)}</div>`
            : ''}
        </div>
        <div class="order-item-price">R$ ${(item.price * item.qty).toFixed(2).replace('.',',')}</div>
      </div>`).join('');
  }

  // Mostrar total confirmado
  const totalEl = document.getElementById('confirmed-total');
  if (totalEl && order.total) {
    totalEl.textContent = `R$ ${order.total.toFixed(2).replace('.',',')}`;
  }

  // Atualizar botão "Acompanhar pelo WhatsApp" com dados reais do pedido
  const msgCliente = montarMsgCliente(order);
  document.querySelectorAll('.track-whatsapp').forEach(btn => {
    btn.href = `https://wa.me/${WA_SUPORTE1}?text=${encodeURIComponent(msgCliente)}`;
  });

  // Botão alternativo Suporte 2
  document.querySelectorAll('.track-whatsapp-2').forEach(btn => {
    btn.href = `https://wa.me/${WA_SUPORTE2}?text=${encodeURIComponent(msgCliente)}`;
  });
}

// ---- Dual WhatsApp Float --------------------------------
function toggleWA() {
  const opts = document.getElementById('wa-options');
  if (!opts) return;
  const isOpen = opts.classList.contains('open');
  opts.classList.toggle('open', !isOpen);
  // Fechar ao clicar fora
  if (!isOpen) {
    setTimeout(() => {
      document.addEventListener('click', function closeWA(e) {
        if (!e.target.closest('#wa-float')) {
          opts.classList.remove('open');
          document.removeEventListener('click', closeWA);
        }
      });
    }, 50);
  }
}

// ---- Countdown Timer ------------------------------------
function initCountdown() {
  const hEl = document.querySelector('.cd-hours');
  const mEl = document.querySelector('.cd-mins');
  const sEl = document.querySelector('.cd-secs');
  if (!hEl) return;
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  let remaining = endOfDay - now;
  setInterval(() => {
    remaining -= 1000;
    if (remaining < 0) remaining = 86400000;
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    if (hEl) hEl.textContent = String(h).padStart(2,'0');
    if (mEl) mEl.textContent = String(m).padStart(2,'0');
    if (sEl) sEl.textContent = String(s).padStart(2,'0');
  }, 1000);
}

// ---- Mobile Menu ----------------------------------------
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navMobile = document.querySelector('.nav-mobile');
  if (!hamburger || !navMobile) return;
  hamburger.addEventListener('click', () => {
    navMobile.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    const isOpen = navMobile.classList.contains('open');
    spans[0].style.transform = isOpen ? 'rotate(45deg) translate(5px,5px)' : '';
    spans[1].style.opacity  = isOpen ? '0' : '1';
    spans[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px,-5px)' : '';
  });
}

// ---- Sticky Header Shadow --------------------------------
function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

// ---- Product Page ---------------------------------------
function initProductPage() {
  const addBtn = document.querySelector('.add-to-cart-btn');
  if (!addBtn) return;

  const uploadInput = document.querySelector('#photo-upload');
  const uploadPreview = document.querySelector('.upload-preview');
  if (uploadInput && uploadPreview) {
    uploadInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        uploadPreview.src = ev.target.result;
        uploadPreview.classList.add('show');
      };
      reader.readAsDataURL(file);
    });
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
      uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
      uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
      uploadArea.addEventListener('drop', e => {
        e.preventDefault(); uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) { uploadInput.files = e.dataTransfer.files; uploadInput.dispatchEvent(new Event('change')); }
      });
      uploadArea.addEventListener('click', () => uploadInput.click());
    }
  }

  const qtyInput = document.querySelector('.product-qty');
  document.querySelector('.qty-minus')?.addEventListener('click', () => {
    if (qtyInput && parseInt(qtyInput.value) > 1) qtyInput.value = parseInt(qtyInput.value) - 1;
  });
  document.querySelector('.qty-plus')?.addEventListener('click', () => {
    if (qtyInput) qtyInput.value = parseInt(qtyInput.value) + 1;
  });

  document.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  addBtn.addEventListener('click', () => {
    const nameInput  = document.querySelector('#custom-name')?.value || '';
    const teamInput  = document.querySelector('#custom-team')?.value || '';
    const colorInput = document.querySelector('input[name="color"]:checked')?.value || '';
    const textInput  = document.querySelector('#custom-text')?.value || '';
    const qty = parseInt(document.querySelector('.product-qty')?.value) || 1;
    addToCart({
      id: addBtn.dataset.productId || 'product-1',
      name: addBtn.dataset.productName || 'Produto Personalizado',
      price: parseFloat(addBtn.dataset.price) || 39.90,
      emoji: addBtn.dataset.emoji || '☕',
      bgClass: addBtn.dataset.bg || 'bg-caneca',
      qty,
      custom: { Nome: nameInput, Time: teamInput, Cor: colorInput, Texto: textInput }
    });
  });
}

// ---- Payment Tabs ----------------------------------------
function initPaymentTabs() {
  const tabs = document.querySelectorAll('.payment-tab');
  const panels = document.querySelectorAll('.payment-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.querySelector(`[data-panel="${tab.dataset.tab}"]`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ---- CEP Lookup ------------------------------------------
function initCepLookup() {
  const cepInput = document.querySelector('#cep');
  if (!cepInput) return;
  cepInput.addEventListener('blur', async () => {
    const cep = cepInput.value.replace(/\D/g,'');
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { showToast('CEP não encontrado', 'error'); return; }
      if (document.getElementById('rua'))    document.getElementById('rua').value    = data.logradouro;
      if (document.getElementById('bairro')) document.getElementById('bairro').value = data.bairro;
      if (document.getElementById('cidade')) document.getElementById('cidade').value = data.localidade;
      if (document.getElementById('estado')) document.getElementById('estado').value = data.uf;
    } catch { /* offline */ }
  });
}

// ---- Shipping Calc (cart) --------------------------------
function initShippingCalc() {
  const btn = document.querySelector('.calc-shipping-btn');
  const input = document.querySelector('.shipping-cep-input');
  const result = document.querySelector('.shipping-result');
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const cep = input.value.replace(/\D/g,'');
    if (cep.length !== 8) { showToast('Digite um CEP válido', 'error'); return; }
    if (result) {
      result.innerHTML = `
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:.85rem">
            <input type="radio" name="ship" checked> PAC — R$ 19,90 (5-8 dias úteis)
          </label>
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:.85rem">
            <input type="radio" name="ship"> SEDEX — R$ 34,90 (1-3 dias úteis)
          </label>
        </div>`;
    }
  });
}

// ---- Coupon (cart) ---------------------------------------
function initCoupon() {
  const btn = document.querySelector('.apply-coupon-btn');
  const input = document.querySelector('.coupon-input');
  if (!btn || !input) return;
  const coupons = { 'COPA10': 10, 'FRETE': 0, 'GOL15': 15 };
  btn.addEventListener('click', () => {
    const code = input.value.trim().toUpperCase();
    if (coupons[code] !== undefined) {
      showToast(`Cupom ${code} aplicado! 🎉`, 'success');
    } else {
      showToast('Cupom inválido ou expirado', 'error');
    }
  });
}

// ---- Product Filters -------------------------------------
function initFilters() {
  const sortSelect = document.querySelector('.sort-select');
  if (!sortSelect) return;
  sortSelect.addEventListener('change', () => showToast('Ordenação aplicada', 'info'));
}

// ---- Input Masks -----------------------------------------
function maskPhone(input) {
  input.addEventListener('input', function() {
    let v = this.value.replace(/\D/g,'').substring(0,11);
    if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    this.value = v;
  });
}
function maskCPF(input) {
  input.addEventListener('input', function() {
    let v = this.value.replace(/\D/g,'').substring(0,11);
    if (v.length > 9) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
    else if (v.length > 6) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
    else if (v.length > 3) v = `${v.slice(0,3)}.${v.slice(3)}`;
    this.value = v;
  });
}
function maskCard(input) {
  input.addEventListener('input', function() {
    let v = this.value.replace(/\D/g,'').substring(0,16);
    v = v.match(/.{1,4}/g)?.join(' ') || v;
    this.value = v;
  });
}
function maskExpiry(input) {
  input.addEventListener('input', function() {
    let v = this.value.replace(/\D/g,'').substring(0,4);
    if (v.length > 2) v = `${v.slice(0,2)}/${v.slice(2)}`;
    this.value = v;
  });
}
function maskCEP(input) {
  input.addEventListener('input', function() {
    let v = this.value.replace(/\D/g,'').substring(0,8);
    if (v.length > 5) v = `${v.slice(0,5)}-${v.slice(5)}`;
    this.value = v;
  });
}
function initMasks() {
  document.querySelectorAll('[data-mask="phone"]').forEach(maskPhone);
  document.querySelectorAll('[data-mask="cpf"]').forEach(maskCPF);
  document.querySelectorAll('[data-mask="card"]').forEach(maskCard);
  document.querySelectorAll('[data-mask="expiry"]').forEach(maskExpiry);
  document.querySelectorAll('[data-mask="cep"]').forEach(maskCEP);
}

// ---- Scroll Animations -----------------------------------
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.product-card, .category-card, .step-card, .testimonial-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    observer.observe(el);
  });
}

// ---- Init ------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();
  renderCartSidebar();
  initCountdown();
  initMobileMenu();
  initHeaderScroll();
  initProductPage();
  initPaymentTabs();
  initCepLookup();
  initShippingCalc();
  initCoupon();
  initCheckoutForm();
  initObrigado();
  initFilters();
  initMasks();
  initScrollAnimations();

  document.querySelectorAll('.open-cart').forEach(el => el.addEventListener('click', openCartSidebar));
  document.querySelector('.close-cart')?.addEventListener('click', closeCartSidebar);
  document.querySelector('.cart-overlay')?.addEventListener('click', closeCartSidebar);

  if (document.querySelector('.cart-table')) renderCartPage();
});
