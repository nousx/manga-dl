import type {
  DownloadEvent,
  ErrorCode,
  SerializedError,
} from "../../shared/api";

export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  text: string;
  detail?: string;
}

interface ErrorText {
  title: string;
  hint: string;
}

const ERROR_TEXT: Record<ErrorCode, ErrorText> = {
  INVALID_URL: {
    title: "ลิงก์ไม่ถูกต้อง",
    hint: "ใส่ลิงก์หน้าเรื่อง เช่น https://arenascan.com/manga/<ชื่อเรื่อง>/",
  },
  UNSUPPORTED_SITE: {
    title: "ยังไม่รองรับเว็บนี้",
    hint: "เพิ่ม module ของเว็บใน src/sites แล้วลงทะเบียนใน src/sites/index.ts",
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
};

export const errorTitle = (error: SerializedError): string =>
  ERROR_TEXT[error.code].title;

export const errorHint = (error: SerializedError): string =>
  ERROR_TEXT[error.code].hint;

/** Technical line shown under the Thai explanation: code plus the raw message. */
export const errorDetail = (error: SerializedError): string =>
  `[${error.code}] ${error.message}`;

const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;

type Line = Omit<LogEntry, "id" | "time">;

/** Turns a core event into a log line; returns null for events too noisy to list. */
export const describeEvent = (event: DownloadEvent): Line | null => {
  switch (event.type) {
    case "job-start":
      return {
        level: "info",
        text: `เริ่มโหลด "${event.seriesTitle}" จำนวน ${event.chapterCount} ตอน`,
        detail: event.seriesDir,
      };
    case "chapter-pages":
      return {
        level: "info",
        text: `${event.label}: พบ ${event.pageCount} รูป กำลังโหลด`,
      };
    case "page-failed":
      return {
        level: "error",
        text: `${event.label} รูปที่ ${event.pageIndex}: ${errorTitle(event.error)}`,
        detail: `${errorDetail(event.error)}\n${event.url}`,
      };
    case "retry":
      return {
        level: "warn",
        text: `ลองใหม่ครั้งที่ ${event.attempt}/${event.maxAttempts - 1} อีก ${Math.round(event.waitMs / 1000)} วินาที`,
        detail: event.reason,
      };
    case "chapter-done": {
      const pages = `${event.okPages}/${event.totalPages} รูป`;
      if (event.status === "done") {
        return { level: "success", text: `${event.label}: เสร็จ ${pages}` };
      }
      if (event.status === "skipped") {
        return {
          level: "info",
          text: `${event.label}: ข้าม มีครบแล้ว ${pages}`,
        };
      }
      const reason = event.error ? errorTitle(event.error) : "บางรูปโหลดไม่ได้";
      return {
        level: "error",
        text:
          event.status === "incomplete"
            ? `${event.label}: ไม่ครบ ${pages} (${reason})`
            : `${event.label}: ล้มเหลว (${reason})`,
        detail: event.error
          ? `${errorDetail(event.error)}\n${errorHint(event.error)}`
          : undefined,
      };
    }
    case "job-done": {
      const { summary } = event;
      const problems = summary.incomplete + summary.failed;
      return {
        level: summary.cancelled || problems > 0 ? "warn" : "success",
        text: `${summary.cancelled ? "ยกเลิก" : "จบงาน"}: เสร็จ ${summary.done} ข้าม ${summary.skipped} ไม่ครบ ${summary.incomplete} ล้มเหลว ${summary.failed}`,
      };
    }
    case "job-error":
      return {
        level: "error",
        text: `งานหยุดกลางคัน: ${errorTitle(event.error)}`,
        detail: `${errorDetail(event.error)}\n${errorHint(event.error)}`,
      };
    case "chapter-start":
    case "page-done":
      return null;
  }
};

export { formatBytes };
