import type { Messages } from "./types";

export const ja: Messages = {
  intlLocale: "ja-JP",
  nav: {
    label: "メインページ",
    download: "ダウンロード",
    history: "履歴",
    sites: "対応サイト",
  },
  pageTitle: {
    download: "ダウンロード",
    history: "ダウンロード履歴",
    sites: "対応サイト",
  },
  working: "実行中",
  common: {
    close: "閉じる",
    clear: "クリア",
    openSeriesFolder: "作品フォルダーを開く",
    pages: (done, total) => `${done}/${total} 枚`,
  },
  sidebar: {
    downloading: "ダウンロード中",
    chapters: (done, total) => `${done}/${total} 話`,
    viewProgress: "進行状況を見る",
    ready: "準備完了",
    readyHint: "画像はお使いのパソコンに保存されます",
  },
  settings: {
    summary: "ダウンロード設定",
    summaryDetail: (images, delayMs) => `同時に ${images} 枚 · ${delayMs} ms`,
    saveTo: "保存先",
    change: "変更",
    openFolder: "フォルダーを開く",
    concurrencyBefore: "同時ダウンロード",
    concurrencyAfter: "枚",
    delay: "待機",
    language: "言語",
  },
  empty: {
    title: "ウェブページからあなたのフォルダーへ",
    line1: "作品ページのリンクを貼り付けて「取得」を押します",
    line2: "話を選ぶと、画像を読む順番に並べて保存します。",
    viewSites: "対応サイトを見る",
  },
  url: {
    label: "作品ページのリンク",
    placeholder: "https://arenascan.com/manga/<作品名>/",
    fetch: "取得",
    fetching: "取得中...",
  },
  status: {
    none: "未取得",
    queued: "待機中",
    running: "取得中",
    done: "完了",
    incomplete: "未完了",
    failed: "失敗",
  },
  series: {
    meta: (site, total, done) =>
      `${site} · 全 ${total} 話 · 保存済み ${done} 話`,
    gaps: (count, listed, more) =>
      `元のサイトにない話が ${count} 件あります: ${listed}${more > 0 ? ` ほか ${more} 件` : ""}`,
    selectAll: "すべて選択",
    selectUnfinished: "未完了を選択",
    rangeLabel: "話の範囲 (例: 1-20)",
    selectRange: "範囲を選択",
    cancel: "キャンセル",
    download: (count) => `${count} 話をダウンロード`,
    overallProgress: "全体の進行状況",
    jobProgress: (finished, total, size) => `${finished}/${total} 話 · ${size}`,
  },
  summary: {
    line: (cancelled, { done, skipped, incomplete, failed }) =>
      `${cancelled ? "途中でキャンセル" : "終了"}: 完了 ${done} · スキップ (保存済み) ${skipped} · 未完了 ${incomplete} · 失敗 ${failed}`,
    failedPages: (count, list) =>
      `${count} 枚を取得できませんでした (${list} 枚目)`,
    selectFailures: "問題のある話だけ選択",
  },
  log: {
    title: "動作ログ",
    errorCount: (count) => `エラー ${count} 件`,
    problemsOnly: "問題のみ",
    logFiles: "ログファイル",
    previous: "前へ",
    next: "次へ",
    range: (from, to, total) => `${from}–${to} / 全 ${total} 件`,
    follow: "最新を追う",
    empty: "まだ項目がありません",
    jobStart: (title, count) =>
      `「${title}」のダウンロードを開始、全 ${count} 話`,
    chapterPages: (label, count) => `${label}: ${count} 枚を検出、取得中`,
    pageFailed: (label, index, reason) => `${label} ${index} 枚目: ${reason}`,
    retry: (attempt, max, seconds) =>
      `再試行 ${attempt}/${max}、${seconds} 秒後`,
    chapterDone: (label, pages) => `${label}: 完了 ${pages}`,
    chapterSkipped: (label, pages) => `${label}: スキップ、保存済み ${pages}`,
    chapterIncomplete: (label, pages, reason) =>
      `${label}: 未完了 ${pages} (${reason})`,
    chapterFailed: (label, reason) => `${label}: 失敗 (${reason})`,
    somePagesFailed: "一部の画像を取得できませんでした",
    jobDone: (cancelled, { done, skipped, incomplete, failed }) =>
      `${cancelled ? "キャンセル" : "終了"}: 完了 ${done}、スキップ ${skipped}、未完了 ${incomplete}、失敗 ${failed}`,
    jobError: (reason) => `処理が途中で止まりました: ${reason}`,
  },
  history: {
    heading: "保存した作品",
    description:
      "選択したフォルダーの履歴を読み込みます。アプリを閉じても残ります。",
    refresh: "更新",
    reading: "読み込み中…",
    currentFolder: "現在のフォルダー",
    readingHistory: "パソコンから履歴を読み込み中…",
    issues: (count) =>
      `${count} 件を読み込めませんでした。ファイルや権限を確認して、更新してください。`,
    reasons: {
      missing: "ファイルが見つかりません",
      unreadable: "読み込めません",
      malformed: "データが正しくありません",
      unsafe: "別のファイルやフォルダーへのリンクをスキップしました",
    },
    emptyTitle: "最初の作品から始めましょう",
    emptyLine1: "話をダウンロードすると、履歴が作品ごとにここへまとまります。",
    emptyLine2:
      "完了した話や再試行が必要な話を確認し、フォルダーをすぐに開けます。",
    goDownload: "ダウンロードページへ",
    caption: (count) => `${count} 作品 · 更新が新しい順`,
    complete: (count) => `完了 ${count}`,
    incomplete: (count) => `未完了 ${count}`,
    failed: (count) => `失敗 ${count}`,
    continueSeries: "この作品を続けて取得",
    waitForJob: "作品の切り替えは現在の処理が終わってからできます",
  },
  sites: {
    heading: "利用できるサイト",
    description:
      "これらのサイトの作品ページのリンクを貼り付けて、話を選びます。",
    count: (count) => `${count} サイト`,
    supported: "対応済み",
    engine: "エンジン",
    exampleLink: "リンクの例",
    tryExample: "この作品で試す",
    copyLink: "リンクをコピー",
    copied: "リンクをコピーしました",
    copyFailed:
      "コピーできませんでした。上のリンクを選択して Ctrl+C を押してください。",
    waitForJob: "現在の処理が終わると作品を切り替えられます",
    addTitle: "新しいサイトを追加できます",
    addBefore: "サイトのファイルを",
    addBetween: "に追加し、",
    addAfter: "に登録します。",
    addShared: "同じテーマを使うサイトは、読み取りモジュールを共有できます。",
  },
  update: {
    checking: "更新を確認中…",
    upToDate: "最新バージョンです",
    downloading: (version, percent) =>
      `バージョン ${version} をダウンロード中 (${percent}%)`,
    ready: (version) => `バージョン ${version} をインストールできます`,
    restart: "再起動して更新",
    check: "更新を確認",
    failed: "更新の確認に失敗しました",
    portable: "ポータブル版は自動更新できません",
    development: "開発モード: 更新を確認しません",
    openReleases: "ダウンロードページを開く",
  },
  errors: {
    INVALID_URL: {
      title: "リンクが正しくありません",
      hint: "作品ページのリンクを入力してください。例: https://arenascan.com/manga/<作品名>/",
    },
    UNSUPPORTED_SITE: {
      title: "このサイトにはまだ対応していません",
      hint: "利用できるサイトは「対応サイト」ページで確認できます。",
    },
    NETWORK: {
      title: "接続できません",
      hint: "インターネット接続を確認して、もう一度ダウンロードしてください。自動再試行はすべて使い切りました。",
    },
    HTTP_STATUS: {
      title: "サイトがエラーを返しました",
      hint: "サイトが停止しているか、アクセス頻度を制限している可能性があります。待機時間を増やして再度お試しください。",
    },
    BLOCKED: {
      title: "サイトにブロックされました",
      hint: "サイトがリクエストを拒否しました (Cloudflare または 403)。しばらく待ち、待機時間を増やしてから再度お試しください。",
    },
    NOT_FOUND: {
      title: "ページが見つかりません (404)",
      hint: "作品や話が削除または移動された可能性があります。作品情報を取得し直してください。",
    },
    PARSE_FAILED: {
      title: "ページの構造を読み取れません",
      hint: "サイトの構造が変わったようです。このサイトのモジュールを修正する必要があります。",
    },
    CHAPTER_LIST_EMPTY: {
      title: "話の一覧が見つかりません",
      hint: "まだ話がないか、サイトが一覧の構造を変更しました。",
    },
    CHAPTER_NO_IMAGES: {
      title: "この話には画像がありません",
      hint: "話がロックされている、ログインが必要、またはまだ画像が公開されていない可能性があります。",
    },
    CHAPTER_MISMATCH: {
      title: "サイトが別の話を返しました",
      hint: "この話のリンクが別の話につながっているため、ファイルが混ざらないよう保存しませんでした。",
    },
    IMAGE_CORRUPT: {
      title: "受け取ったファイルは画像ではありません",
      hint: "画像サーバーが誤ったデータを返しました。未完了の話だけ再度ダウンロードしてください。",
    },
    UNSAFE_URL: {
      title: "リンクが安全でないアドレスを指しています",
      hint: "ページがこのパソコンや内部ネットワークを指すリンクを返したため、開きませんでした。すべての話で起きる場合は、サイトに問題がある可能性があります。",
    },
    RESPONSE_TOO_LARGE: {
      title: "受け取ったデータが大きすぎます",
      hint: "サーバーが異常に大きなファイルを送ってきました。メモリを守るため受信を中止しました。",
    },
    FILE_SYSTEM: {
      title: "ファイルを書き込めません",
      hint: "保存先フォルダーの権限と空き容量、または他のアプリがファイルを開いていないか確認してください。",
    },
    INVALID_INPUT: {
      title: "入力内容が正しくありません",
      hint: "入力した値を確認して、もう一度お試しください。",
    },
    BUSY: {
      title: "ダウンロード中です",
      hint: "現在の処理が終わるのを待つか、先にキャンセルしてください。",
    },
    CANCELLED: {
      title: "キャンセルしました",
      hint: "取得済みの画像は残っています。もう一度ダウンロードすると続きから再開します。",
    },
    UNKNOWN: {
      title: "不明なエラー",
      hint: "詳しくはログファイルを確認してください。",
    },
  },
};
