import type { Messages } from "./types";

export const th: Messages = {
  intlLocale: "th-TH",
  nav: {
    label: "หน้าหลัก",
    download: "ดาวน์โหลด",
    history: "ประวัติ",
    sites: "เว็บที่รองรับ",
  },
  pageTitle: {
    download: "ดาวน์โหลด",
    history: "ประวัติการดาวน์โหลด",
    sites: "เว็บที่รองรับ",
  },
  working: "กำลังทำงาน",
  common: {
    close: "ปิด",
    clear: "ล้าง",
    openSeriesFolder: "เปิดโฟลเดอร์เรื่อง",
    pages: (done, total) => `${done}/${total} รูป`,
  },
  sidebar: {
    downloading: "กำลังดาวน์โหลด",
    chapters: (done, total) => `${done}/${total} ตอน`,
    viewProgress: "ดูความคืบหน้า",
    ready: "พร้อมใช้งาน",
    readyHint: "บันทึกภาพไว้ในเครื่องของคุณ",
  },
  settings: {
    summary: "ตั้งค่าการดาวน์โหลด",
    summaryDetail: (images, delayMs) => `${images} รูปพร้อมกัน · ${delayMs} ms`,
    saveTo: "บันทึกที่",
    change: "เปลี่ยน",
    openFolder: "เปิดโฟลเดอร์",
    concurrencyBefore: "โหลดพร้อมกัน",
    concurrencyAfter: "รูป",
    delay: "หน่วง",
    language: "ภาษา",
  },
  empty: {
    title: "จากหน้าเว็บ สู่โฟลเดอร์ของคุณ",
    line1: "วางลิงก์หน้าเรื่อง แล้วกด “ดึงข้อมูล”",
    line2: "เลือกตอนที่ต้องการ โปรแกรมจะเรียงภาพให้พร้อมใช้งาน",
    viewSites: "ดูเว็บที่รองรับ",
  },
  url: {
    label: "ลิงก์หน้าเรื่อง",
    placeholder: "https://arenascan.com/manga/<ชื่อเรื่อง>/",
    fetch: "ดึงข้อมูล",
    fetching: "กำลังดึง...",
  },
  status: {
    none: "ยังไม่โหลด",
    queued: "รอคิว",
    running: "กำลังโหลด",
    done: "ครบ",
    incomplete: "ไม่ครบ",
    failed: "ล้มเหลว",
  },
  series: {
    meta: (site, total, done) =>
      `${site} · ${total} ตอน · มีในเครื่องครบ ${done} ตอน`,
    gaps: (count, listed, more) =>
      `เว็บต้นทางไม่มี ${count} ตอน: ${listed}${more > 0 ? ` และอีก ${more} ตอน` : ""}`,
    selectAll: "เลือกทั้งหมด",
    selectUnfinished: "เลือกที่ยังไม่ครบ",
    rangeLabel: "ช่วงตอน เช่น 1-20",
    selectRange: "เลือกช่วง",
    cancel: "ยกเลิก",
    download: (count) => `โหลด ${count} ตอน`,
    overallProgress: "ความคืบหน้าทั้งหมด",
    jobProgress: (finished, total, size) =>
      `${finished}/${total} ตอน · ${size}`,
  },
  summary: {
    line: (cancelled, { done, skipped, incomplete, failed }) =>
      `${cancelled ? "ยกเลิกกลางคัน" : "จบงาน"}: เสร็จ ${done} · ข้าม (มีครบแล้ว) ${skipped} · ไม่ครบ ${incomplete} · ล้มเหลว ${failed}`,
    failedPages: (count, list) => `โหลดไม่ได้ ${count} รูป (รูปที่ ${list})`,
    selectFailures: "เลือกเฉพาะตอนที่มีปัญหา",
  },
  log: {
    title: "บันทึกการทำงาน",
    errorCount: (count) => `${count} ข้อผิดพลาด`,
    problemsOnly: "เฉพาะปัญหา",
    logFiles: "ไฟล์ log",
    previous: "ก่อนหน้า",
    next: "ถัดไป",
    range: (from, to, total) => `${from}–${to} จาก ${total}`,
    follow: "ติดตามล่าสุด",
    empty: "ยังไม่มีรายการ",
    jobStart: (title, count) => `เริ่มโหลด "${title}" จำนวน ${count} ตอน`,
    chapterPages: (label, count) => `${label}: พบ ${count} รูป กำลังโหลด`,
    pageFailed: (label, index, reason) => `${label} รูปที่ ${index}: ${reason}`,
    retry: (attempt, max, seconds) =>
      `ลองใหม่ครั้งที่ ${attempt}/${max} อีก ${seconds} วินาที`,
    chapterDone: (label, pages) => `${label}: เสร็จ ${pages}`,
    chapterSkipped: (label, pages) => `${label}: ข้าม มีครบแล้ว ${pages}`,
    chapterIncomplete: (label, pages, reason) =>
      `${label}: ไม่ครบ ${pages} (${reason})`,
    chapterFailed: (label, reason) => `${label}: ล้มเหลว (${reason})`,
    somePagesFailed: "บางรูปโหลดไม่ได้",
    jobDone: (cancelled, { done, skipped, incomplete, failed }) =>
      `${cancelled ? "ยกเลิก" : "จบงาน"}: เสร็จ ${done} ข้าม ${skipped} ไม่ครบ ${incomplete} ล้มเหลว ${failed}`,
    jobError: (reason) => `งานหยุดกลางคัน: ${reason}`,
  },
  history: {
    heading: "เรื่องที่บันทึกไว้",
    description: "อ่านจากประวัติในโฟลเดอร์ที่เลือก เก็บไว้แม้ปิดโปรแกรม",
    refresh: "รีเฟรช",
    reading: "กำลังอ่าน…",
    currentFolder: "โฟลเดอร์ปัจจุบัน",
    readingHistory: "กำลังอ่านประวัติจากเครื่อง…",
    issues: (count) =>
      `อ่านไม่ได้ ${count} รายการ ตรวจสอบไฟล์หรือสิทธิ์ แล้วกดรีเฟรช`,
    reasons: {
      missing: "ไม่พบไฟล์",
      unreadable: "อ่านไม่ได้",
      malformed: "ข้อมูลไม่ถูกต้อง",
      unsafe: "ข้ามลิงก์ไปยังไฟล์หรือโฟลเดอร์อื่น",
    },
    emptyTitle: "เริ่มสะสมเรื่องแรก",
    emptyLine1: "เมื่อดาวน์โหลดตอน ประวัติจะรวมไว้ตามเรื่องที่นี่",
    emptyLine2: "ดูตอนที่ครบ ตอนที่ต้องลองใหม่ และเปิดโฟลเดอร์ได้ทันที",
    goDownload: "ไปหน้าดาวน์โหลด",
    caption: (count) => `${count} เรื่อง · เรียงตามการอัปเดตล่าสุด`,
    complete: (count) => `ครบ ${count}`,
    incomplete: (count) => `ไม่ครบ ${count}`,
    failed: (count) => `ล้มเหลว ${count}`,
    continueSeries: "โหลดเรื่องนี้ต่อ",
    waitForJob: "รอให้งานปัจจุบันจบก่อนเปลี่ยนเรื่อง",
  },
  sites: {
    heading: "เว็บไซต์ที่พร้อมใช้งาน",
    description:
      "วางลิงก์หน้าเรื่องจากเว็บไซต์เหล่านี้ เพื่อเลือกตอนที่ต้องการ",
    count: (count) => `${count} เว็บไซต์`,
    supported: "รองรับ",
    engine: "เอนจิน",
    exampleLink: "ลิงก์ตัวอย่าง",
    tryExample: "ลองโหลดเรื่องนี้",
    copyLink: "คัดลอกลิงก์",
    copied: "คัดลอกลิงก์แล้ว",
    copyFailed: "คัดลอกไม่ได้ เลือกลิงก์ด้านบนแล้วกด Ctrl+C",
    waitForJob: "เปลี่ยนเรื่องได้เมื่องานปัจจุบันจบ",
    addTitle: "เพิ่มเว็บไซต์ใหม่ได้",
    addBefore: "เพิ่มไฟล์ของเว็บไซต์ใน",
    addBetween: "แล้วลงทะเบียนใน",
    addAfter: "",
    addShared: "เว็บไซต์ที่ใช้ธีมเดียวกัน ใช้โมดูลอ่านข้อมูลร่วมกันได้",
  },
  update: {
    checking: "กำลังตรวจหาอัปเดต…",
    upToDate: "เป็นรุ่นล่าสุดแล้ว",
    downloading: (version, percent) => `กำลังโหลดรุ่น ${version} (${percent}%)`,
    ready: (version) => `รุ่น ${version} พร้อมติดตั้ง`,
    restart: "รีสตาร์ตเพื่ออัปเดต",
    check: "ตรวจหาอัปเดต",
    failed: "ตรวจอัปเดตไม่สำเร็จ",
    portable: "รุ่น portable อัปเดตเองไม่ได้",
    development: "โหมดพัฒนา ไม่ตรวจอัปเดต",
    openReleases: "เปิดหน้าดาวน์โหลด",
  },
  errors: {
    INVALID_URL: {
      title: "ลิงก์ไม่ถูกต้อง",
      hint: "ใส่ลิงก์หน้าเรื่อง เช่น https://arenascan.com/manga/<ชื่อเรื่อง>/",
    },
    UNSUPPORTED_SITE: {
      title: "ยังไม่รองรับเว็บนี้",
      hint: "ดูรายชื่อเว็บที่ใช้ได้ในหน้า “เว็บที่รองรับ”",
    },
    NETWORK: {
      title: "เชื่อมต่อไม่ได้",
      hint: "ตรวจอินเทอร์เน็ต แล้วกดโหลดซ้ำ ระบบลองใหม่ให้ครบจำนวนครั้งแล้ว",
    },
    HTTP_STATUS: {
      title: "เว็บตอบกลับผิดปกติ",
      hint: "เว็บอาจล่มหรือจำกัดความถี่ ลองเพิ่มค่าหน่วงเวลาแล้วโหลดซ้ำ",
    },
    BLOCKED: {
      title: "ถูกเว็บบล็อก",
      hint: "เว็บปฏิเสธคำขอ (Cloudflare หรือ 403) รอสักพัก เพิ่มค่าหน่วงเวลา แล้วลองใหม่",
    },
    NOT_FOUND: {
      title: "ไม่พบหน้านี้ (404)",
      hint: "เรื่องหรือตอนอาจถูกลบหรือย้ายลิงก์ กดดึงข้อมูลเรื่องใหม่",
    },
    PARSE_FAILED: {
      title: "อ่านโครงหน้าเว็บไม่ได้",
      hint: "เว็บน่าจะเปลี่ยนโครงสร้าง ต้องแก้ module ของเว็บนี้",
    },
    CHAPTER_LIST_EMPTY: {
      title: "ไม่พบรายการตอน",
      hint: "เรื่องยังไม่มีตอน หรือเว็บเปลี่ยนโครงสร้างรายการตอน",
    },
    CHAPTER_NO_IMAGES: {
      title: "ตอนนี้ไม่มีรูป",
      hint: "ตอนอาจถูกล็อก ต้องล็อกอิน หรือเว็บยังไม่ได้ลงรูป",
    },
    CHAPTER_MISMATCH: {
      title: "เว็บส่งผิดตอนมาให้",
      hint: "ลิงก์ของตอนนี้พาไปตอนอื่น จึงไม่บันทึกเพื่อกันไฟล์สลับตอน",
    },
    IMAGE_CORRUPT: {
      title: "ไฟล์ที่ได้ไม่ใช่รูป",
      hint: "เซิร์ฟเวอร์รูปส่งข้อมูลผิดมา กดโหลดซ้ำเฉพาะตอนที่ไม่ครบ",
    },
    UNSAFE_URL: {
      title: "ลิงก์ชี้ไปที่อยู่ที่ไม่ปลอดภัย",
      hint: "หน้าเว็บส่งลิงก์ที่ชี้เข้าเครื่องหรือเครือข่ายภายใน โปรแกรมไม่เปิดให้ ถ้าเจอทุกตอน เว็บอาจมีปัญหา",
    },
    RESPONSE_TOO_LARGE: {
      title: "ข้อมูลที่ได้ใหญ่เกินกำหนด",
      hint: "เซิร์ฟเวอร์ส่งไฟล์ใหญ่ผิดปกติ โปรแกรมหยุดรับเพื่อไม่ให้หน่วยความจำเต็ม",
    },
    FILE_SYSTEM: {
      title: "เขียนไฟล์ไม่ได้",
      hint: "ตรวจสิทธิ์โฟลเดอร์ปลายทาง พื้นที่ว่าง หรือไฟล์ถูกโปรแกรมอื่นเปิดอยู่",
    },
    INVALID_INPUT: {
      title: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
      hint: "ตรวจค่าที่กรอกแล้วลองใหม่",
    },
    BUSY: {
      title: "กำลังโหลดอยู่",
      hint: "รอให้งานปัจจุบันเสร็จหรือกดยกเลิกก่อน",
    },
    CANCELLED: {
      title: "ยกเลิกแล้ว",
      hint: "รูปที่โหลดเสร็จแล้วยังอยู่ กดโหลดซ้ำเพื่อทำต่อจากเดิม",
    },
    UNKNOWN: {
      title: "ข้อผิดพลาดที่ไม่รู้จัก",
      hint: "ดูรายละเอียดในไฟล์ log",
    },
  },
};
