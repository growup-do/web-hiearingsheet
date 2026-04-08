document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('hearingForm');
  const saveBtn = document.getElementById('saveBtn');
  const exportBtn = document.getElementById('exportBtn');

  // プログレスバー追加
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  document.body.prepend(progressBar);

  // トースト通知用要素
  const toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);

  // 「その他」チェックボックスで自由入力欄の表示切替
  const siteTypeOther = document.getElementById('siteTypeOther');
  const siteTypeOtherGroup = document.getElementById('siteTypeOtherGroup');
  siteTypeOther.addEventListener('change', () => {
    siteTypeOtherGroup.style.display = siteTypeOther.checked ? 'block' : 'none';
    if (!siteTypeOther.checked) {
      document.getElementById('siteTypeOtherText').value = '';
    }
  });

  // ページ追加機能
  const pagesGroup = document.querySelector('input[name="pages"]').closest('.checkbox-group');
  const addPageInput = document.getElementById('addPageInput');
  const addPageBtn = document.getElementById('addPageBtn');

  function createPageItem(name, checked) {
    const label = document.createElement('label');
    label.className = 'checkbox-label page-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.name = 'pages';
    cb.value = name;
    cb.checked = checked;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete-page-btn';
    btn.title = '削除';
    btn.innerHTML = '&times;';
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + name + ' '));
    label.appendChild(btn);
    return label;
  }

  addPageBtn.addEventListener('click', () => {
    const name = addPageInput.value.trim();
    if (!name) return;
    // 重複チェック
    const existing = Array.from(pagesGroup.querySelectorAll('input[name="pages"]')).map(cb => cb.value);
    if (existing.includes(name)) {
      addPageInput.value = '';
      return;
    }
    const item = createPageItem(name, true);
    pagesGroup.appendChild(item);
    addPageInput.value = '';
  });

  addPageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPageBtn.click();
    }
  });

  // ページ削除機能（イベント委譲）
  pagesGroup.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-page-btn')) {
      e.preventDefault();
      e.target.closest('.page-item').remove();
    }
  });

  // スクロールでプログレスバー更新
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  });

  // フォームデータ取得
  function getFormData() {
    const data = {};
    // テキスト系
    const textFields = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea, select');
    textFields.forEach(field => {
      if (field.name) data[field.name] = field.value;
    });
    // チェックボックス
    const checkboxGroups = {};
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (!checkboxGroups[cb.name]) checkboxGroups[cb.name] = [];
      if (cb.checked) checkboxGroups[cb.name].push(cb.value);
    });
    Object.assign(data, checkboxGroups);
    // ラジオ
    form.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
      data[radio.name] = radio.value;
    });
    return data;
  }

  // フォームデータ復元
  function restoreFormData(data) {
    if (!data) return;
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // チェックボックス
        form.querySelectorAll(`input[name="${key}"]`).forEach(cb => {
          cb.checked = value.includes(cb.value);
        });
      } else {
        const field = form.querySelector(`[name="${key}"]`);
        if (field) {
          if (field.type === 'radio') {
            const radio = form.querySelector(`input[name="${key}"][value="${value}"]`);
            if (radio) radio.checked = true;
          } else {
            field.value = value;
          }
        }
      }
    });
  }

  // 起動時に下書き復元
  const saved = localStorage.getItem('hearingSheetDraft');
  if (saved) {
    try {
      restoreFormData(JSON.parse(saved));
      // 「その他」チェック状態に応じて入力欄を表示
      siteTypeOtherGroup.style.display = siteTypeOther.checked ? 'block' : 'none';
      showToast('下書きを復元しました');
    } catch (e) {
      // ignore
    }
  }

  // 下書き保存
  saveBtn.addEventListener('click', () => {
    const data = getFormData();
    localStorage.setItem('hearingSheetDraft', JSON.stringify(data));
    showToast('下書きを保存しました');
  });

  // 自動保存（30秒ごと）
  setInterval(() => {
    const data = getFormData();
    localStorage.setItem('hearingSheetDraft', JSON.stringify(data));
  }, 30000);

  // PDF出力
  exportBtn.addEventListener('click', () => {
    const data = getFormData();
    const content = generatePrintContent(data);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  });

  function generatePrintContent(data) {
    const labels = {
      companyName: '会社名・屋号',
      businessType: '業種・事業内容',
      siteType: 'サイトの種類',
      siteTypeOtherText: 'サイトの種類（その他）',
      purpose: 'サイト制作の目的',
      currentSite: '現在のサイトURL',
      currentIssue: '現在のサイトの課題',
      targetUser: 'ターゲットユーザー',
      targetAction: '期待するアクション',
      atmosphere: 'サイトの雰囲気',
      colorPreference: '希望カラー',
      referenceSites: '参考サイト',
      designNote: 'デザイン要望',
      pages: '必要なページ',
      features: '必要な機能',
      otherFeatures: 'その他機能',
      logo: 'ロゴデータ',
      photos: '写真素材',
      text: 'テキスト原稿',
      budget: 'ご予算',
      deadline: '希望納期',
      maintenance: '運用・保守',
      competitors: '競合サイト',
      otherRequests: 'その他要望'
    };

    let rows = '';
    Object.entries(labels).forEach(([key, label]) => {
      const val = data[key];
      if (val && (Array.isArray(val) ? val.length > 0 : val.trim() !== '')) {
        const display = Array.isArray(val) ? val.join('、') : val;
        rows += `<tr><th>${label}</th><td>${escapeHtml(display)}</td></tr>`;
      }
    });

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ヒアリングシート</title>
  <style>
    body { font-family: 'Hiragino Sans', sans-serif; padding: 40px; color: #333; }
    h1 { font-size: 22px; text-align: center; margin-bottom: 8px; }
    .date { text-align: center; color: #888; font-size: 13px; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 10px 14px; font-size: 13px; text-align: left; }
    th { background: #f5f5f5; width: 160px; font-weight: 600; white-space: nowrap; }
    td { white-space: pre-wrap; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Webサイト制作 ヒアリングシート</h1>
  <p class="date">作成日：${new Date().toLocaleDateString('ja-JP')}</p>
  <table>${rows}</table>
</body>
</html>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // バリデーション
  function validateForm() {
    let isValid = true;
    // エラー状態クリア
    form.querySelectorAll('.form-group.error').forEach(g => g.classList.remove('error'));
    form.querySelectorAll('.error-message').forEach(e => e.remove());

    // 必須テキスト
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        showFieldError(field, '入力してください');
        isValid = false;
      }
    });

    // 必須チェックボックス（サイトの種類、目的、雰囲気）
    ['siteType', 'purpose', 'atmosphere'].forEach(name => {
      const checked = form.querySelectorAll(`input[name="${name}"]:checked`);
      if (checked.length === 0) {
        const group = form.querySelector(`input[name="${name}"]`).closest('.form-group');
        if (!group.classList.contains('error')) {
          group.classList.add('error');
          const msg = document.createElement('div');
          msg.className = 'error-message';
          msg.textContent = '1つ以上選択してください';
          group.appendChild(msg);
        }
        isValid = false;
      }
    });

    return isValid;
  }

  function showFieldError(field, message) {
    const group = field.closest('.form-group');
    group.classList.add('error');
    const msg = document.createElement('div');
    msg.className = 'error-message';
    msg.textContent = message;
    group.appendChild(msg);
  }

  // 送信
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm()) {
      // 最初のエラーまでスクロール
      const firstError = form.querySelector('.form-group.error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const data = getFormData();
    const labels = {
      companyName: '会社名・屋号',
      businessType: '業種・事業内容',
      siteType: 'サイトの種類',
      siteTypeOtherText: 'サイトの種類（その他）',
      purpose: 'サイト制作の目的',
      currentSite: '現在のサイトURL',
      currentIssue: '現在のサイトの課題',
      targetUser: 'ターゲットユーザー',
      targetAction: '期待するアクション',
      atmosphere: 'サイトの雰囲気',
      colorPreference: '希望カラー',
      referenceSites: '参考サイト',
      designNote: 'デザイン要望',
      pages: '必要なページ',
      features: '必要な機能',
      otherFeatures: 'その他機能',
      logo: 'ロゴデータ',
      photos: '写真素材',
      text: 'テキスト原稿',
      budget: 'ご予算',
      deadline: '希望納期',
      maintenance: '運用・保守',
      competitors: '競合サイト',
      otherRequests: 'その他要望'
    };

    // メール本文を組み立て
    let body = 'Webサイト制作ヒアリングシートの回答\n';
    body += '作成日：' + new Date().toLocaleDateString('ja-JP') + '\n';
    body += '─────────────────────\n\n';
    Object.entries(labels).forEach(([key, label]) => {
      const val = data[key];
      if (val && (Array.isArray(val) ? val.length > 0 : val.trim() !== '')) {
        const display = Array.isArray(val) ? val.join('、') : val;
        body += `【${label}】\n${display}\n\n`;
      }
    });

    const subject = encodeURIComponent(`【ヒアリングシート】${data.companyName || ''}`);
    const mailBody = encodeURIComponent(body);
    window.location.href = `mailto:suzuki@growup-do.com?subject=${subject}&body=${mailBody}`;

    // 下書き削除
    localStorage.removeItem('hearingSheetDraft');

    // 完了モーダル表示
    document.getElementById('completeModal').classList.add('active');
  });

  // トースト通知
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
});

// モーダルを閉じる
function closeModal() {
  document.getElementById('completeModal').classList.remove('active');
}
