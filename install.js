(() => {
  const button = document.getElementById("install-button");
  const dialog = document.getElementById("install-dialog");
  const description = document.getElementById("install-description");
  const confirm = document.getElementById("install-confirm");
  const cancel = document.getElementById("install-cancel");
  const standalone = window.matchMedia("(display-mode: standalone)");
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let pending = null;
  let installed = false;
  let busy = false;
  const isInstalled = () => installed || standalone.matches || navigator.standalone === true;
  const refresh = () => {
    button.hidden = isInstalled() || (!ios && !pending);
    if (isInstalled() && dialog.open) dialog.close();
  };
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    pending = event;
    installed = false;
    refresh();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    pending = null;
    refresh();
  });
  standalone.addEventListener("change", refresh);
  window.addEventListener("pageshow", refresh);
  button.addEventListener("click", () => {
    if (isInstalled()) return;
    description.textContent = ios
      ? "Safariでこのページを開き、共有ボタン（四角から上向きの矢印）→「ホーム画面に追加」→「追加」を選んでください。「Webアプリとして開く」がある場合はオンにします。項目が見つからない場合は共有メニューを下にスクロールしてください。"
      : "シュナプセンをインストールしますか？ OKを押すとブラウザの確認画面が開きます。その画面でも「インストール」を選んでください。";
    confirm.hidden = ios || !pending;
    cancel.textContent = ios ? "閉じる" : "キャンセル";
    dialog.showModal();
  });
  cancel.addEventListener("click", () => dialog.close());
  // Keep Enter/Space within this dialog from dismissing the game's score overlay.
  dialog.addEventListener("keydown", (event) => event.stopPropagation());
  confirm.addEventListener("click", async () => {
    if (!pending || busy || isInstalled()) return;
    const request = pending;
    pending = null;
    busy = true;
    confirm.disabled = true;
    dialog.close();
    refresh();
    try {
      await request.prompt();
      const choice = await request.userChoice;
      if (choice.outcome === "accepted") installed = true;
    } catch {
      description.textContent = "インストールを開始できませんでした。ページを再読み込みするか、ブラウザのメニューからインストールしてください。";
      confirm.hidden = true;
      cancel.textContent = "閉じる";
      dialog.showModal();
    } finally {
      busy = false;
      confirm.disabled = false;
      refresh();
    }
  });
  refresh();
})();
