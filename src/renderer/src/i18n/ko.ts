import type { Messages } from "./types";

export const ko: Messages = {
  intlLocale: "ko-KR",
  nav: {
    label: "주요 페이지",
    download: "다운로드",
    history: "기록",
    sites: "지원 사이트",
  },
  pageTitle: {
    download: "다운로드",
    history: "다운로드 기록",
    sites: "지원 사이트",
  },
  working: "작업 중",
  common: {
    close: "닫기",
    clear: "지우기",
    openSeriesFolder: "작품 폴더 열기",
    pages: (done, total) => `${done}/${total}장`,
  },
  sidebar: {
    downloading: "다운로드 중",
    chapters: (done, total) => `${done}/${total}화`,
    viewProgress: "진행 상황 보기",
    ready: "준비됨",
    readyHint: "이미지는 내 컴퓨터에 저장됩니다",
  },
  settings: {
    summary: "다운로드 설정",
    summaryDetail: (images, delayMs) => `동시에 ${images}장 · ${delayMs} ms`,
    saveTo: "저장 위치",
    change: "변경",
    openFolder: "폴더 열기",
    concurrencyBefore: "동시 다운로드",
    concurrencyAfter: "장",
    delay: "지연",
    language: "언어",
  },
  empty: {
    title: "웹 페이지에서 내 폴더로",
    line1: "작품 페이지 링크를 붙여 넣고 “가져오기”를 누르세요",
    line2: "원하는 화를 고르면 이미지를 읽는 순서대로 저장합니다.",
    viewSites: "지원 사이트 보기",
  },
  url: {
    label: "작품 페이지 링크",
    placeholder: "https://arenascan.com/manga/<작품-이름>/",
    fetch: "가져오기",
    fetching: "가져오는 중...",
  },
  status: {
    none: "받지 않음",
    queued: "대기 중",
    running: "받는 중",
    done: "완료",
    incomplete: "미완료",
    failed: "실패",
  },
  series: {
    meta: (site, total, done) =>
      `${site} · 총 ${total}화 · 내 컴퓨터에 완료 ${done}화`,
    gaps: (count, listed, more) =>
      `원본 사이트에 없는 화 ${count}개: ${listed}${more > 0 ? ` 외 ${more}개` : ""}`,
    selectAll: "모두 선택",
    selectUnfinished: "미완료만 선택",
    rangeLabel: "화 범위, 예: 1-20",
    selectRange: "범위 선택",
    cancel: "취소",
    download: (count) => `${count}화 다운로드`,
    overallProgress: "전체 진행 상황",
    jobProgress: (finished, total, size) => `${finished}/${total}화 · ${size}`,
  },
  summary: {
    line: (cancelled, { done, skipped, incomplete, failed }) =>
      `${cancelled ? "중간에 취소됨" : "작업 종료"}: 완료 ${done} · 건너뜀(이미 완료) ${skipped} · 미완료 ${incomplete} · 실패 ${failed}`,
    failedPages: (count, list) => `${count}장을 받지 못함 (${list}번째)`,
    selectFailures: "문제가 있는 화만 선택",
  },
  log: {
    title: "작업 로그",
    errorCount: (count) => `오류 ${count}개`,
    problemsOnly: "문제만 보기",
    logFiles: "로그 파일",
    previous: "이전",
    next: "다음",
    range: (from, to, total) => `${from}–${to} / 총 ${total}`,
    follow: "최신 항목 따라가기",
    empty: "아직 항목이 없습니다",
    jobStart: (title, count) => `"${title}" 다운로드 시작, 총 ${count}화`,
    chapterPages: (label, count) => `${label}: ${count}장 발견, 받는 중`,
    pageFailed: (label, index, reason) => `${label} ${index}번째 장: ${reason}`,
    retry: (attempt, max, seconds) =>
      `재시도 ${attempt}/${max}, ${seconds}초 후`,
    chapterDone: (label, pages) => `${label}: 완료 ${pages}`,
    chapterSkipped: (label, pages) => `${label}: 건너뜀, 이미 완료 ${pages}`,
    chapterIncomplete: (label, pages, reason) =>
      `${label}: 미완료 ${pages} (${reason})`,
    chapterFailed: (label, reason) => `${label}: 실패 (${reason})`,
    somePagesFailed: "일부 이미지를 받지 못함",
    jobDone: (cancelled, { done, skipped, incomplete, failed }) =>
      `${cancelled ? "취소됨" : "작업 종료"}: 완료 ${done}, 건너뜀 ${skipped}, 미완료 ${incomplete}, 실패 ${failed}`,
    jobError: (reason) => `작업이 중간에 멈췄습니다: ${reason}`,
  },
  history: {
    heading: "저장된 작품",
    description:
      "선택한 폴더의 기록을 읽어 옵니다. 프로그램을 닫아도 남아 있습니다.",
    refresh: "새로 고침",
    reading: "읽는 중…",
    currentFolder: "현재 폴더",
    readingHistory: "컴퓨터에서 기록을 읽는 중…",
    issues: (count) =>
      `${count}개 항목을 읽지 못했습니다. 파일이나 권한을 확인한 뒤 새로 고침 하세요.`,
    reasons: {
      missing: "파일을 찾을 수 없음",
      unreadable: "읽을 수 없음",
      malformed: "잘못된 데이터",
      unsafe: "다른 파일이나 폴더로 가는 링크를 건너뜀",
    },
    emptyTitle: "첫 작품부터 시작해 보세요",
    emptyLine1: "화를 다운로드하면 기록이 작품별로 여기에 모입니다.",
    emptyLine2:
      "완료된 화와 다시 받아야 할 화를 확인하고 폴더를 바로 열 수 있습니다.",
    goDownload: "다운로드 페이지로 이동",
    caption: (count) => `작품 ${count}개 · 최근 업데이트 순`,
    complete: (count) => `완료 ${count}`,
    incomplete: (count) => `미완료 ${count}`,
    failed: (count) => `실패 ${count}`,
    continueSeries: "이 작품 이어서 받기",
    waitForJob: "현재 작업이 끝난 뒤 작품을 바꿀 수 있습니다",
  },
  sites: {
    heading: "사용할 수 있는 사이트",
    description: "이 사이트들의 작품 페이지 링크를 붙여 넣어 화를 선택하세요.",
    count: (count) => `사이트 ${count}개`,
    supported: "지원됨",
    engine: "엔진",
    exampleLink: "예시 링크",
    tryExample: "이 작품으로 해 보기",
    copyLink: "링크 복사",
    copied: "링크를 복사했습니다",
    copyFailed: "복사하지 못했습니다. 위 링크를 선택하고 Ctrl+C를 누르세요.",
    waitForJob: "현재 작업이 끝나면 작품을 바꿀 수 있습니다",
    addTitle: "새 사이트를 추가할 수 있습니다",
    addBefore: "사이트 파일을",
    addBetween: "에 추가하고",
    addAfter: "에 등록하세요.",
    addShared: "같은 테마를 쓰는 사이트는 읽기 모듈을 함께 사용할 수 있습니다.",
  },
  update: {
    checking: "업데이트 확인 중…",
    upToDate: "최신 버전입니다",
    downloading: (version, percent) =>
      `버전 ${version} 다운로드 중 (${percent}%)`,
    ready: (version) => `버전 ${version} 설치 준비 완료`,
    restart: "다시 시작하여 업데이트",
    check: "업데이트 확인",
    failed: "업데이트 확인 실패",
    portable: "포터블 버전은 자동 업데이트할 수 없습니다",
    development: "개발 모드: 업데이트를 확인하지 않습니다",
    openReleases: "다운로드 페이지 열기",
  },
  errors: {
    INVALID_URL: {
      title: "잘못된 링크",
      hint: "작품 페이지 링크를 입력하세요. 예: https://arenascan.com/manga/<작품-이름>/",
    },
    UNSUPPORTED_SITE: {
      title: "아직 지원하지 않는 사이트",
      hint: "사용할 수 있는 사이트는 “지원 사이트” 페이지에서 확인하세요.",
    },
    NETWORK: {
      title: "연결할 수 없음",
      hint: "인터넷 연결을 확인하고 다시 다운로드하세요. 자동 재시도 횟수를 모두 사용했습니다.",
    },
    HTTP_STATUS: {
      title: "사이트가 오류를 반환함",
      hint: "사이트가 다운되었거나 요청 빈도를 제한하고 있을 수 있습니다. 지연 값을 올리고 다시 받아 보세요.",
    },
    BLOCKED: {
      title: "사이트에서 차단됨",
      hint: "사이트가 요청을 거부했습니다(Cloudflare 또는 403). 잠시 기다린 뒤 지연 값을 올리고 다시 시도하세요.",
    },
    NOT_FOUND: {
      title: "페이지를 찾을 수 없음 (404)",
      hint: "작품이나 화가 삭제되었거나 링크가 바뀌었을 수 있습니다. 작품 정보를 다시 가져오세요.",
    },
    PARSE_FAILED: {
      title: "페이지 구조를 읽을 수 없음",
      hint: "사이트 구조가 바뀐 것 같습니다. 이 사이트의 모듈을 수정해야 합니다.",
    },
    CHAPTER_LIST_EMPTY: {
      title: "화 목록을 찾을 수 없음",
      hint: "아직 화가 없거나 사이트가 화 목록 구조를 바꿨습니다.",
    },
    CHAPTER_NO_IMAGES: {
      title: "이 화에 이미지가 없음",
      hint: "화가 잠겨 있거나, 로그인이 필요하거나, 아직 이미지가 올라오지 않았을 수 있습니다.",
    },
    CHAPTER_MISMATCH: {
      title: "사이트가 다른 화를 보냄",
      hint: "이 화의 링크가 다른 화로 연결되어, 파일이 섞이지 않도록 저장하지 않았습니다.",
    },
    IMAGE_CORRUPT: {
      title: "받은 파일이 이미지가 아님",
      hint: "이미지 서버가 잘못된 데이터를 보냈습니다. 미완료 화만 다시 받아 보세요.",
    },
    UNSAFE_URL: {
      title: "링크가 안전하지 않은 주소를 가리킴",
      hint: "페이지가 이 컴퓨터나 내부 네트워크를 가리키는 링크를 보내 열지 않았습니다. 모든 화에서 발생하면 사이트에 문제가 있을 수 있습니다.",
    },
    RESPONSE_TOO_LARGE: {
      title: "받은 데이터가 너무 큼",
      hint: "서버가 비정상적으로 큰 파일을 보냈습니다. 메모리 보호를 위해 수신을 중단했습니다.",
    },
    FILE_SYSTEM: {
      title: "파일을 쓸 수 없음",
      hint: "대상 폴더의 권한과 남은 공간, 또는 다른 프로그램이 파일을 열고 있는지 확인하세요.",
    },
    INVALID_INPUT: {
      title: "입력 값이 올바르지 않음",
      hint: "입력한 값을 확인하고 다시 시도하세요.",
    },
    BUSY: {
      title: "다운로드가 진행 중",
      hint: "현재 작업이 끝날 때까지 기다리거나 먼저 취소하세요.",
    },
    CANCELLED: {
      title: "취소됨",
      hint: "이미 받은 이미지는 그대로 있습니다. 다시 다운로드하면 이어서 받습니다.",
    },
    UNKNOWN: {
      title: "알 수 없는 오류",
      hint: "자세한 내용은 로그 파일을 확인하세요.",
    },
  },
};
